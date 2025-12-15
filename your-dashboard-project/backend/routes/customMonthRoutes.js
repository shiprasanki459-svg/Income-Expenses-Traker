// backend/routes/customMonthRoutes.js

import express from "express";
import * as customCompare from "../controllers/customCompareController.js";

const router = express.Router();

router.get("/items", customCompare.getItemsFromSheet);
router.post("/custom-compare", customCompare.postCustomCompare);

export default router;
