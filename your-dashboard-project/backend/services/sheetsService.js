// backend/services/sheetsService.js
import axios from "axios";
import Papa from "papaparse";


/**
 * Map different header spellings to canonical lowercase keys
 * that the backend controllers expect.
 */
const HEADER_ALIASES = {
  "time stamp": "time stamp",
  "timestamp": "time stamp",
  "date": "date",
  "name": "name",

  // NEW: added for your dataset
  "pl code": "pl code",
  "plcode": "pl code",
  "p l code": "pl code",
  "bs code": "bs code",
  "grouping code": "grouping code",
  "group code": "grouping code",
  "groupingcode": "grouping code",

  "product name": "product name",
  "product": "product name",

  "bags": "bags",
  "quantity": "quantity",
  "qty": "quantity",
  "qnty": "qnty",
  "rate": "rate",
  "amount": "amount",
  "type": "type",
  "remarks": "remarks",
  "ratio": "ratio",
  "stock qty": "stock qty",
  "stockqty": "stock qty"
  

};

/**
 * Normalize a row's keys based on HEADER_ALIASES.
 * Converts headers to lowercase, trims whitespace,
 * and maps known aliases to a canonical form.
 */
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

/**
 * Fetches and parses the CSV sheet using PapaParse.
 * Returns an array of normalized row objects with canonical keys.
 */
async function fetchSheetRows() {
  const url = process.env.SHEET_CSV_URL;
  if (!url) throw new Error("SHEET_CSV_URL missing in .env");

  const { data: csv } = await axios.get(url, {
                                  responseType: "text",
                                  timeout: 8000
                                });

  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });

  const rows = parsed.data.map(canonicalizeRow);

  // 🔍 Debug: print header keys once
  if (rows.length) {
    console.log("[SHEETS] fetched rows:", rows.length);
    console.log("[SHEETS] normalized keys in first row:", Object.keys(rows[0]).join(" | "));
  }

  return rows;
}

export { fetchSheetRows, HEADER_ALIASES };
