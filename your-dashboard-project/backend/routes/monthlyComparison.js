import express from "express";
import * as ctrl from "../controllers/monthlyComparisonController.js";

const router = express.Router();

router.get("/", ctrl.getMonthlyComparison);

export default router;
