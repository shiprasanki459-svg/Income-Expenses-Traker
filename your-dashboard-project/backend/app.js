//backend/app.js

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
app.get("/health", (_, res) => res.json({ ok: true }));

// routes
app.use("/", dashboardRoutes);
app.use("/auth", authRoutes);
app.use("/monthly-comparison", monthlyComparisonRoutes);
app.use("/bank", bankRoutes);
app.use("/month", customMonthRoutes);


export default app;
