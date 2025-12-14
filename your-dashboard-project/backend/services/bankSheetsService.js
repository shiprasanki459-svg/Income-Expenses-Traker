// backend/services/bankSheetsService.js
import axios from "axios";
import Papa from "papaparse";

// reuse the same header aliases from sheetsService
import { HEADER_ALIASES } from "./sheetsService.js";


// same canonicalization as dashboard
function canonicalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const key = (k || "").trim().toLowerCase();
    const mapped = HEADER_ALIASES[key];
    if (mapped) {
      out[mapped] = typeof v === "string" ? v.trim() : v;
    }
  }
  return out;
}

async function fetchBankSheetRows() {
  const url = process.env.BANK_SHEET_CSV_URL;
  if (!url) throw new Error("BANK_SHEET_CSV_URL missing in .env");

  const { data: csv } = await axios.get(url, { responseType: "text" });
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });

  const rows = parsed.data.map(canonicalizeRow);

  if (rows.length) {
    console.log("[BANK SHEETS] fetched rows:", rows.length);
    console.log(
      "[BANK SHEETS] normalized keys in first row:",
      Object.keys(rows[0]).join(" | ")
    );
  }

  return rows;
}

export { fetchBankSheetRows };
