import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import dashboardRoutes from "./routes/dashboard.js";
import authRoutes from "./routes/auth.js";
import monthlyComparisonRoutes from "./routes/monthlyComparison.js";
import bankRoutes from "./routes/bank.js";
import customMonthRoutes from "./routes/customMonthRoutes.js";

dotenv.config(); // ✅ loads .env for LOCAL only

const app = express();

app.use(express.json());
app.use(morgan("tiny"));

const rawOrigins = process.env.ORIGIN || "";
const origins = rawOrigins.split(",").map(s => s.trim()).filter(Boolean);

app.use(
  cors({
    origin: origins.length === 0 ? "*" : origins,
  })
);

// health
app.get("/api/health", (_, res) => res.json({ ok: true }));

// routes
app.use("/api", dashboardRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/monthly-comparison", monthlyComparisonRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/month", customMonthRoutes);

export default app;
