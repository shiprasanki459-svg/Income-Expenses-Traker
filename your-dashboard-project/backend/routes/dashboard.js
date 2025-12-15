// backend/routes/dashboard.js

import express from "express";
import * as ctrl from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/product-summary", ctrl.getProductSummary);
router.get("/types", ctrl.getTypesByProduct);
router.get("/parties", ctrl.getPartiesByType);
router.get("/invoices", ctrl.getInvoices);
router.get("/opening-balance", ctrl.getOpeningBalance);
router.get("/nagdi-tutra", ctrl.getNagdiTutra);

export default router;
