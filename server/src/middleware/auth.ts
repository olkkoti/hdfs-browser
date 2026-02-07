import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    user?: { username: string };
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}
