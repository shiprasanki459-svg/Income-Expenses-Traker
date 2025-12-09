// backend/server.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(morgan("tiny"));
app.use(cors({ origin: process.env.ORIGIN?.split(",") || "*" }));

app.get("/api/health", (_, res) => res.json({ ok: true }));
app.use("/api", require("./routes/dashboard"));
app.use("/api/auth", require("./routes/auth"));

// after: app.use("/api", require("./routes/dashboard"));
app.use("/api/monthly-comparison", require("./routes/monthlyComparison"));

app.use("/api/bank", require("./routes/bank"));

// existing requires...
app.use("/api/month", require("./routes/customMonthRoutes"));


const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API on :${port}`));
