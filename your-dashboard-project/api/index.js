import express from "express";
import cors from "cors";
import morgan from "morgan";
import serverless from "serverless-http";
import dotenv from "dotenv";

import dashboardRoutes from "../backend/routes/dashboard.js";
import authRoutes from "../backend/routes/auth.js";
import monthlyComparisonRoutes from "../backend/routes/monthlyComparison.js";
import bankRoutes from "../backend/routes/bank.js";
import customMonthRoutes from "../backend/routes/customMonthRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(morgan("tiny"));

// ---------- CORS ----------
const rawOrigins = process.env.ORIGIN || "";
const origins = rawOrigins.split(",").map(s => s.trim()).filter(Boolean);

app.use(
  cors({
    origin:
      origins.length === 0
        ? "*"
        : origins.length === 1
        ? origins[0]
        : origins,
  })
);

// ---------- ROUTES ----------
app.get("/api/health", (_, res) => res.json({ ok: true }));

app.use("/api", dashboardRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/monthly-comparison", monthlyComparisonRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/month", customMonthRoutes);

// ---------- EXPORT FOR VERCEL ----------
export const handler = serverless(app);
