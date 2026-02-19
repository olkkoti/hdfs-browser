import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { existsSync } from "fs";
import { join } from "path";
import authRouter from "./routes/auth.js";
import filesRouter from "./routes/files.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({ origin: process.env.CORS_ORIGIN || true, credentials: true })
);
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? (() => { throw new Error("SESSION_SECRET environment variable is required"); })(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth", authRouter);
app.use("/api/files", requireAuth, filesRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Serve built client in production
const clientDistPath = join(import.meta.dirname, "../../client/dist");
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (_req, res) => {
    res.sendFile(join(clientDistPath, "index.html"));
  });
}

async function start() {
  const { initKerberos } = await import("./services/hdfs.js");
  await initKerberos();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
