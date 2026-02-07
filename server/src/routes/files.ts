import { Router, type Request, type Response } from "express";
import multer from "multer";
import * as hdfs from "../services/hdfs.js";
import "../middleware/auth.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

function getUser(req: Request): string {
  return req.session.user!.username;
}

router.get("/list", async (req: Request, res: Response) => {
  try {
    const path = (req.query.path as string) || "/";
    const data = await hdfs.listDirectory(path, getUser(req));
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.get("/status", async (req: Request, res: Response) => {
  try {
    const path = (req.query.path as string) || "/";
    const data = await hdfs.getFileStatus(path, getUser(req));
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.get("/content", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) {
      res.status(400).json({ error: "path is required" });
      return;
    }
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const length = Math.min(1048576, Math.max(1, parseInt(req.query.length as string) || 65536));
    const status = await hdfs.getFileStatus(path, getUser(req));
    const totalSize = status.FileStatus.length;
    const chunk = offset < totalSize
      ? await hdfs.readFileChunk(path, offset, length, getUser(req))
      : Buffer.alloc(0);
    const actualLength = chunk.length;
    res.json({
      data: chunk.toString("base64"),
      offset,
      length: actualLength,
      totalSize,
      hasMore: offset + actualLength < totalSize,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.get("/download", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) {
      res.status(400).json({ error: "path is required" });
      return;
    }
    const hdfsRes = await hdfs.downloadFile(path, getUser(req));
    const filename = path.split("/").pop() || "download";
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    if (hdfsRes.body) {
      const reader = hdfsRes.body.getReader();
      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        res.write(value);
        return pump();
      };
      await pump();
    } else {
      const buffer = await hdfsRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const path = (req.query.path as string) || "/";
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }
    await hdfs.uploadFile(path, req.file.buffer, req.file.originalname, getUser(req));
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.put("/mkdir", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) {
      res.status(400).json({ error: "path is required" });
      return;
    }
    await hdfs.mkdirs(path, getUser(req));
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.delete("/", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) {
      res.status(400).json({ error: "path is required" });
      return;
    }
    await hdfs.deleteFile(path, getUser(req));
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
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
    await hdfs.modifyAclEntries(path, aclspec, getUser(req));
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
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
    await hdfs.removeAclEntries(path, aclspec, getUser(req));
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.delete("/acl/default", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) {
      res.status(400).json({ error: "path is required" });
      return;
    }
    await hdfs.removeDefaultAcl(path, getUser(req));
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.get("/acl", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) {
      res.status(400).json({ error: "path is required" });
      return;
    }
    const data = await hdfs.getAclStatus(path, getUser(req));
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
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
    await hdfs.setPermission(path, permission, getUser(req));
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
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
    await hdfs.setAcl(path, aclspec, getUser(req));
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.delete("/acl", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;
    if (!path) {
      res.status(400).json({ error: "path is required" });
      return;
    }
    await hdfs.removeAcl(path, getUser(req));
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
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
    await hdfs.rename(from, to, getUser(req));
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
