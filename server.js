require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const chatRoutes = require("./routes/chat.routes");

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "https://sukhi-fe.vercel.app",
  ...(process.env.CLIENT_URLS || "").split(",").map((o) => o.trim()),
  process.env.CLIENT_URL,
].filter(Boolean);
const vercelPreviewOrigin = /^https:\/\/sukhi-fe.*\.vercel\.app$/i;

const corsOptions = {
  origin(origin, callback) {
    // Allow server-to-server and tools with no Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || vercelPreviewOrigin.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

// ─── Middleware ───────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// ─── Routes ──────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// ─── Health Check ─────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error(`[Error] ${statusCode} - ${message}`);
  res.status(statusCode).json({ success: false, message });
});

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
