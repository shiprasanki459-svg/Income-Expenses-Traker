// api/index.js
import serverless from "serverless-http";
import app from "../backend/app.js";

export default serverless(app);
