import { Router, type Request, type Response } from "express";
import multer from "multer";
import * as hdfs from "../services/hdfs.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get("/list", async (req: Request, res: Response) => {
  try {
    const path = (req.query.path as string) || "/";
    const data = await hdfs.listDirectory(path);
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

router.get("/status", async (req: Request, res: Response) => {
  try {
    const path = (req.query.path as string) || "/";
    const data = await hdfs.getFileStatus(path);
    res.json(data);
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
    const hdfsRes = await hdfs.downloadFile(path);
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
    await hdfs.uploadFile(path, req.file.buffer, req.file.originalname);
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
    await hdfs.mkdirs(path);
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
    await hdfs.deleteFile(path);
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
    await hdfs.modifyAclEntries(path, aclspec);
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
    await hdfs.removeAclEntries(path, aclspec);
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
    await hdfs.removeDefaultAcl(path);
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
    const data = await hdfs.getAclStatus(path);
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
    await hdfs.setPermission(path, permission);
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
    await hdfs.setAcl(path, aclspec);
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
    await hdfs.removeAcl(path);
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
    await hdfs.rename(from, to);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
