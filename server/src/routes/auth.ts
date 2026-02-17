import { Router, type Request, type Response } from "express";
import { getAuthProvider } from "../services/auth.js";
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
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    req.session.user = { username };
    res.json({ username });
  } catch {
    res.status(500).json({ error: "Authentication service error" });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to logout" });
      return;
    }
    res.clearCookie("connect.sid");
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
