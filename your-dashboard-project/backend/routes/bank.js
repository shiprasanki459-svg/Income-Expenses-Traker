// backend/routes/bank.js

import express from "express";
import * as ctrl from "../controllers/bankController.js";

const router = express.Router();

router.get("/product-summary", ctrl.getProductSummary);
router.get("/types", ctrl.getTypes);
router.get("/parties", ctrl.getParties);
router.get("/invoices", ctrl.getInvoices);

export default router;
