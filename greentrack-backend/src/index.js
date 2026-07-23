require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const chatRoutes = require("./routes/chat");

const app = express();

app.use(helmet());
app.use(morgan("dev"));

// Only allow the GreenTrack site's origin(s) to call this API.
// Set ALLOWED_ORIGINS as a comma-separated list, e.g.
// "https://greentrack.vercel.app,http://localhost:5500"
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins.includes("*") ? true : allowedOrigins,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use("/api/chat", chatRoutes);

app.get("/health", (req, res) => res.json({ ok: true, service: "greentrack-backend" }));

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[server] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`GreenTrack backend running on port ${PORT}`);
});
