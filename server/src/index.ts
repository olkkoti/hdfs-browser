import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { existsSync } from "fs";
import { join } from "path";
import { logger } from "./logger.js";
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

app.use(
  pinoHttp({
    logger,
    serializers: {
      req: (req) =>
        logger.isLevelEnabled("debug")
          ? { method: req.method, url: req.url, headers: req.headers }
          : { method: req.method, url: req.url },
      res: (res) =>
        logger.isLevelEnabled("debug")
          ? { statusCode: res.statusCode, headers: res.headers }
          : { statusCode: res.statusCode },
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
    logger.info({ port: PORT }, "server started");
  });
}

start().catch((err) => {
  logger.fatal({ err }, "failed to start server");
  process.exit(1);
});
