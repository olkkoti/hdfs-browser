import { Router, type Request, type Response } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import "../middleware/auth.js";

interface UserEntry {
  username: string;
  password: string;
}

const usersFile = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../users.json"), "utf-8")
) as { users: UserEntry[] };

const router = Router();

router.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  const user = usersFile.users.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  req.session.user = { username: user.username };
  res.json({ username: user.username });
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
