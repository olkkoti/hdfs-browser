import { Router, type Request, type Response } from "express";
import { getAuthProvider } from "../services/auth.js";
import { audit, auditLog } from "../logger.js";
import "../middleware/auth.js";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  try {
    const ok = await getAuthProvider().authenticate(username, password);
    if (!ok) {
      audit.warn({ user: username, ip: req.ip }, "[AUDIT] user_login_failed");
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    req.session.user = { username };
    auditLog({ user: username, ip: req.ip }, "user_login");
    res.json({ username });
  } catch {
    audit.warn({ user: username, ip: req.ip, reason: "service_error" }, "[AUDIT] user_login_failed");
    res.status(500).json({ error: "Authentication service error" });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  const user = req.session.user?.username;
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to logout" });
      return;
    }
    res.clearCookie("connect.sid");
    auditLog({ user }, "user_logout");
    res.json({ success: true });
  });
});

router.get("/me", (req: Request, res: Response) => {
  if (!req.session.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ username: req.session.user.username });
});

export default router;
