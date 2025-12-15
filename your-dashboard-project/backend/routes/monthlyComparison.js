// backend/routes/monthlyComparison.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/monthlyComparisonController");

// GET /api/monthly-comparison
router.get("/", ctrl.getMonthlyComparison);

module.exports = router;
