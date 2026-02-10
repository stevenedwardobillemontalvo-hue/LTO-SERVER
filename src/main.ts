import dotenv from "dotenv";
dotenv.config();
import DB from "./config/database";
import express from "express";
import cors from "cors";
import { router } from "./routes/route";
import * as Sentry from "@sentry/node";
import { logger } from "@helpers/logger";
import cookieParser from "cookie-parser";
import path from "path";
import helmet from "helmet";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { authLimiter } from "@middlewares/rateLimiter"; 
import session from "express-session";
import { createServer } from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 6001;
const app = express();
(global as any).__basedir = path.join(__dirname);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT"],
  },
});


// io.on("connection", (socket) => {

//   socket.on("blockDateUpdated", (data) => {
//     console.log("📢 Broadcast update:", data);
//     socket.broadcast.emit("blockDateUpdated", data);
//   });

//   socket.on("disconnect", () => {
//     console.log("🔴 Admin disconnected:", socket.id);
//   });
// });

// ------------------ CORS ------------------
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000", "https://lto-naic-appointment-system.vercel.app"], 
    credentials: true, 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ------------------ Security & parsing ------------------

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: false,
    dnsPrefetchControl: false,
    frameguard: false,
    hidePoweredBy: false,
    hsts: false,
    ieNoOpen: false,
    noSniff: false,
    xssFilter: false,
  })
);

app.use((req, res, next) => {
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  res.header("Cross-Origin-Embedder-Policy", "unsafe-none");
  next();
});

app.use('/uploads',
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000", "https://lto-naic-appointment-system.vercel.app"],
    credentials: true
  }),
  express.static(path.join(__dirname, "../uploads"))
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);

// ------------------ Session ------------------
app.use(
  session({
    name: "lto.sid",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, 
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 2, 
    },
  })
);

// ------------------ Rate limiter ------------------
app.use("/auth/login", authLimiter);
app.use("/auth/register", authLimiter);


// ------------------ Routes ------------------
app.use(router);

// ------------------ Sentry (Production only) ------------------
if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  Sentry.setupExpressErrorHandler(app);

  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(500).json({
      success: false,
      id: res.sentry,
      message: "Internal Server Error",
    });
  });
}


// ------------------ Start server ------------------
DB.authenticate()
  .then(() => {
    logger(`Environment: ${process.env.NODE_ENV}`);
    logger("Database Connected");
    httpServer.listen(PORT, () => {
  logger(`Server + Socket.IO running on port ${PORT}`);
});
  })
  .catch((err: any) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });
