// backend/server.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

require("dotenv").config();

const app = express();

app.use(express.json());
app.use(morgan("tiny"));
// safe CORS handling
const rawOrigins = process.env.ORIGIN || '';
const origins = rawOrigins.split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: origins.length === 0 ? '*' : origins.length === 1 ? origins[0] : origins
}));

app.get("/api/health", (_, res) => res.json({ ok: true }));
app.use("/api", require("./routes/dashboard"));
app.use("/api/auth", require("./routes/auth"));

// after: app.use("/api", require("./routes/dashboard"));
app.use("/api/monthly-comparison", require("./routes/monthlyComparison"));

app.use("/api/bank", require("./routes/bank"));

// existing requires...
app.use("/api/month", require("./routes/customMonthRoutes"));

// ==========================
// Serve Frontend (React)
// ==========================
const frontendPath = path.join(__dirname, "../frontend/dist");

app.use(express.static(frontendPath));

// React SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});


const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API on :${port}`));
