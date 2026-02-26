import { Router, type Request, type Response, type NextFunction } from "express";
import Busboy from "busboy";
import { posix } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import * as hdfs from "../services/hdfs.js";
import { logger, auditLog } from "../logger.js";
import "../middleware/auth.js";

const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || "10737418240", 10);
const router = Router();

function getUser(req: Request): string {
  return req.session.user!.username;
}

function validatePath(path: string): string | null {
  if (path.includes("\0") || !path.startsWith("/")) return null;
  const normalized = posix.normalize(path);
  if (!normalized.startsWith("/")) return null;
  return normalized;
}

// Validate and normalize all path-like query params before routes run
const PATH_PARAMS = ["path", "from", "to"] as const;
router.use((req: Request, res: Response, next: NextFunction) => {
  for (const key of PATH_PARAMS) {
    const value = req.query[key];
    if (typeof value !== "string") continue;
    const normalized = validatePath(value);
    if (!normalized) {
      res.status(400).json({ error: "Invalid path" });
      return;
    }
    req.query[key] = normalized;
  }
  next();
});

function hdfsErrorStatus(err: unknown): number {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("403") || message.includes("AccessControlException")) return 403;
  if (message.includes("404") || message.includes("FileNotFoundException") || message.includes("does not exist")) return 404;
  return 500;
}

function handleHdfsError(err: unknown, res: Response, operation: string): void {
  logger.error({ err }, `${operation} failed`);
  res.status(hdfsErrorStatus(err)).json({ error: `Failed to ${operation}` });
}

function safeContentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

function sanitizeFilename(raw: string): string {
  const lastSlash = Math.max(raw.lastIndexOf("/"), raw.lastIndexOf("\\"));
  return lastSlash >= 0 ? raw.substring(lastSlash + 1) : raw;
}

router.get("/list", async (req: Request, res: Response) => {
  try {
    const path = (req.query.path as string) || "/";
    const user = getUser(req);
    const data = await hdfs.listDirectory(path, user);
    auditLog({ user, path }, "dir_list");
    res.json(data);
  } catch (err: unknown) {
    handleHdfsError(err, res, "list directory");
  }
});

router.get("/status", async (req: Request, res: Response) => {
  try {
    const path = (req.query.path as string) || "/";
    const user = getUser(req);
    const data = await hdfs.getFileStatus(path, user);
    auditLog({ user, path }, "file_status");
    res.json(data);
  } catch (err: unknown) {
    handleHdfsError(err, res, "get file status");
  }
});

router.get("/content", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) { res.status(400).json({ error: "path is required" }); return; }
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const length = Math.min(1048576, Math.max(1, parseInt(req.query.length as string) || 65536));
    const status = await hdfs.getFileStatus(path, getUser(req));
    const totalSize = status.FileStatus.length;
    const chunk = offset < totalSize
      ? await hdfs.readFileChunk(path, offset, length, getUser(req))
      : Buffer.alloc(0);
    const actualLength = chunk.length;
    auditLog({ user: getUser(req), path, offset, length: actualLength, totalSize }, "file_read");
    res.json({
      data: chunk.toString("base64"),
      offset,
      length: actualLength,
      totalSize,
      hasMore: offset + actualLength < totalSize,
    });
  } catch (err: unknown) {
    handleHdfsError(err, res, "read file content");
  }
});

router.get("/download", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) { res.status(400).json({ error: "path is required" }); return; }
    const user = getUser(req);
    const hdfsRes = await hdfs.downloadFile(path, user);
    auditLog({ user, path }, "file_download");
    const filename = path.split("/").pop() || "download";
    res.setHeader("Content-Disposition", safeContentDisposition(filename));
    res.setHeader("Content-Type", "application/octet-stream");

    if (hdfsRes.body) {
      const nodeStream = Readable.fromWeb(hdfsRes.body as import("stream/web").ReadableStream);
      await pipeline(nodeStream, res);
    } else {
      const buffer = await hdfsRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (err: unknown) {
    if (!res.headersSent) {
      handleHdfsError(err, res, "download file");
    }
  }
});

router.post("/upload", async (req: Request, res: Response) => {
  try {
    const contentLength = parseInt(req.headers["content-length"] || "", 10);
    if (contentLength > MAX_UPLOAD_SIZE) {
      res.status(413).json({ error: `File exceeds maximum upload size of ${MAX_UPLOAD_SIZE} bytes` });
      return;
    }

    const path = (req.query.path as string) || "/";
    const user = getUser(req);

    const { filename, fileStream } = await new Promise<{ filename: string; fileStream: Readable }>((resolve, reject) => {
      let resolved = false;
      const busboy = Busboy({
        headers: req.headers,
        limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
      });

      busboy.on("file", (fieldname, stream, info) => {
        if (fieldname !== "file" || resolved) {
          stream.resume();
          return;
        }
        resolved = true;
        const fname = sanitizeFilename(info.filename);
        if (!fname) {
          stream.destroy();
          reject(new Error("Invalid filename"));
          return;
        }
        stream.on("limit", () => {
          stream.destroy(new Error(`File exceeds maximum upload size of ${MAX_UPLOAD_SIZE} bytes`));
        });
        resolve({ filename: fname, fileStream: stream });
      });

      busboy.on("error", reject);
      busboy.on("close", () => { if (!resolved) reject(new Error("No file provided")); });

      req.pipe(busboy);
    });

    await hdfs.uploadFile(path, fileStream, filename, user);
    auditLog({ user, path, filename }, "file_upload");
    res.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("maximum upload size")) {
      res.status(413).json({ error: err.message });
      return;
    }
    if (err instanceof Error && (err.message === "No file provided" || err.message === "Invalid filename")) {
      res.status(400).json({ error: err.message });
      return;
    }
    handleHdfsError(err, res, "upload file");
  }
});

router.put("/mkdir", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) { res.status(400).json({ error: "path is required" }); return; }
    const user = getUser(req);
    await hdfs.mkdirs(path, user);
    auditLog({ user, path }, "dir_create");
    res.json({ success: true });
  } catch (err: unknown) {
    handleHdfsError(err, res, "create directory");
  }
});

router.delete("/", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) { res.status(400).json({ error: "path is required" }); return; }
    const user = getUser(req);
    await hdfs.deleteFile(path, user);
    auditLog({ user, path }, "file_delete");
    res.json({ success: true });
  } catch (err: unknown) {
    handleHdfsError(err, res, "delete file");
  }
});

// ACL sub-routes must be registered before base /acl routes
router.put("/acl/modify", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    const aclspec = req.query.aclspec as string;
    if (!path || !aclspec) {
      res.status(400).json({ error: "path and aclspec are required" });
      return;
    }
    const user = getUser(req);
    await hdfs.modifyAclEntries(path, aclspec, user);
    auditLog({ user, path, aclspec }, "acl_modify");
    res.json({ success: true });
  } catch (err: unknown) {
    handleHdfsError(err, res, "modify ACL entries");
  }
});

router.put("/acl/remove", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    const aclspec = req.query.aclspec as string;
    if (!path || !aclspec) {
      res.status(400).json({ error: "path and aclspec are required" });
      return;
    }
    const user = getUser(req);
    await hdfs.removeAclEntries(path, aclspec, user);
    auditLog({ user, path, aclspec }, "acl_remove");
    res.json({ success: true });
  } catch (err: unknown) {
    handleHdfsError(err, res, "remove ACL entries");
  }
});

router.delete("/acl/default", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) { res.status(400).json({ error: "path is required" }); return; }
    const user = getUser(req);
    await hdfs.removeDefaultAcl(path, user);
    auditLog({ user, path }, "acl_remove_default");
    res.json({ success: true });
  } catch (err: unknown) {
    handleHdfsError(err, res, "remove default ACL");
  }
});

router.get("/acl", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) { res.status(400).json({ error: "path is required" }); return; }
    const user = getUser(req);
    const data = await hdfs.getAclStatus(path, user);
    auditLog({ user, path }, "acl_read");
    res.json(data);
  } catch (err: unknown) {
    handleHdfsError(err, res, "get ACL status");
  }
});

router.put("/permission", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    const permission = req.query.permission as string;
    if (!path || !permission) {
      res.status(400).json({ error: "path and permission are required" });
      return;
    }
    const user = getUser(req);
    await hdfs.setPermission(path, permission, user);
    auditLog({ user, path, permission }, "permission_set");
    res.json({ success: true });
  } catch (err: unknown) {
    handleHdfsError(err, res, "set permission");
  }
});

router.put("/acl", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    const aclspec = req.query.aclspec as string;
    if (!path || !aclspec) {
      res.status(400).json({ error: "path and aclspec are required" });
      return;
    }
    const user = getUser(req);
    await hdfs.setAcl(path, aclspec, user);
    auditLog({ user, path, aclspec }, "acl_set");
    res.json({ success: true });
  } catch (err: unknown) {
    handleHdfsError(err, res, "set ACL");
  }
});

router.delete("/acl", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) { res.status(400).json({ error: "path is required" }); return; }
    const user = getUser(req);
    await hdfs.removeAcl(path, user);
    auditLog({ user, path }, "acl_remove_all");
    res.json({ success: true });
  } catch (err: unknown) {
    handleHdfsError(err, res, "remove ACL");
  }
});

router.put("/rename", async (req: Request, res: Response) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    if (!from || !to) {
      res.status(400).json({ error: "from and to are required" });
      return;
    }
    const user = getUser(req);
    await hdfs.rename(from, to, user);
    auditLog({ user, from, to }, "file_rename");
    res.json({ success: true });
  } catch (err: unknown) {
    handleHdfsError(err, res, "rename");
  }
});

export default router;
