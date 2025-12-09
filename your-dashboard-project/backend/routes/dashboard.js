// backend/routes/dashboard.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/dashboardController");

router.get("/product-summary", ctrl.getProductSummary);
router.get("/types", ctrl.getTypesByProduct);
router.get("/parties", ctrl.getPartiesByType);
router.get("/invoices", ctrl.getInvoices);

router.get("/opening-balance", ctrl.getOpeningBalance);
router.get("/nagdi-tutra", ctrl.getNagdiTutra);   

module.exports = router;
