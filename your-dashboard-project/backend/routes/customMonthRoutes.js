// backend/routes/monthRoutes.js
const express = require("express");
const router = express.Router();

const customCompare = require("../controllers/customCompareController");

// GET items from sheet (optional - frontend can call if it wants item list)
router.get("/items", customCompare.getItemsFromSheet);

// POST custom compare
router.post("/custom-compare", customCompare.postCustomCompare);

module.exports = router;
