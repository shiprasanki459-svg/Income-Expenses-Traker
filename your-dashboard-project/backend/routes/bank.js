// backend/routes/bank.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/bankController");

router.get("/product-summary", ctrl.getProductSummary);
router.get("/types", ctrl.getTypes);
router.get("/parties", ctrl.getParties);
router.get("/invoices", ctrl.getInvoices);

module.exports = router;
