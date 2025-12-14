// backend/controllers/dashboardController.js
import { fetchSheetRows } from "../services/sheetsService.js";

/* ---------- helpers ---------- */
const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  const cleaned = String(v).replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "." || cleaned === "-" || cleaned === "-.") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};
const sumBy = (arr, key) => arr.reduce((t, r) => t + toNum(r[key]), 0);
const avgBy = (arr, key) => {
  let sum = 0, count = 0;
  for (const r of arr) {
    const n = toNum(r[key]);
    if (Number.isFinite(n)) { sum += n; count++; }
  }
  return count ? (sum / count) : 0;
};
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const groupBy = (arr, key) =>
  arr.reduce((m, r) => {
    const k = (r[key] || "").toString().trim();
    if (!k) return m;
    (m[k] ||= []).push(r);
    return m;
  }, {});

// Quantity mapping per your rule:
//  - Quantity-1  -> from column "Qnty"  (normalized => "qnty")
//  - Quantity-2  -> from column "Quantity" (normalized => "quantity")
const asAggRow = (base, list) => ({
  ...base,
  stockQty: round2(sumBy(list, "stock qty")),   // normalized key
  q1:       round2(sumBy(list, "qnty")),        // normalized key
  q2:       round2(sumBy(list, "quantity")),    // normalized key
  rate:     Number(avgBy(list, "rate").toFixed(2)),
  amount:   sumBy(list, "amount"),
});

// If no time query is provided, default to current month/year (1..12)
function withDefaultMonthYear(q = {}) {
  const hasAny =
    (q.start && q.start.trim && q.start.trim()) ||
    (q.end && q.end.trim && q.end.trim()) ||
    q.month !== undefined ||
    q.year !== undefined;

  if (hasAny) return q;

  const today = new Date();
  return {
    ...q,
    month: today.getMonth() + 1,   // 1..12
    year: today.getFullYear(),
  };
}

// --- Date helpers (keep your existing toDate) ---
const toDate = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();

  // Try ISO first
  const d1 = new Date(s);
  if (!isNaN(d1)) return d1;

  // Try dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = Number(m[1]), mm = Number(m[2]) - 1;
    // handle 2-digit year -> 2000+
    const yyyy = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = new Date(yyyy, mm, dd);
    if (!isNaN(d)) return d;
  }

  return null;
};

// Use "date" first, fallback to "time stamp" — but also support "new_date" object and many variants
const getRowDate = (r) => {
  if (!r || typeof r !== "object") return null;

  // canonical keys we might have after normalization:
  // prefer 'date', then 'new date', then 'time stamp', then 'timestamp'
  const candidates = [
    r["date"],
    r["new date"],
    r["time stamp"],
    r["timestamp"],
    r["time_stamp"],
    r["time"] // defensive
  ];

  for (const raw of candidates) {
    if (raw === undefined || raw === null) continue;
    // BigQuery sometimes returns { value: "YYYY-MM-DD" }
    const maybe = (typeof raw === "object" && raw.value !== undefined) ? raw.value : raw;
    const d = toDate(maybe);
    if (d) return d;
  }

  // last-ditch: try parsing the timestamp field if present as stringified object
  // (some rows may have combined timestamp like "13-11-2025 00:00")
  const tsRaw = r["timestamp"] || r["time stamp"] || r["time"];
  if (tsRaw) {
    const rawVal = (typeof tsRaw === "object" && tsRaw.value !== undefined) ? tsRaw.value : tsRaw;
    const d = toDate(rawVal);
    if (d) return d;
  }

  return null;
};

// Apply filters from query: start (YYYY-MM-DD), end (YYYY-MM-DD), month (1-12), year (YYYY')
const filterRowsByTime = (rows, q) => {
  let start = q.start ? new Date(q.start) : null;
  let end   = q.end   ? new Date(q.end)   : null;
  const month = q.month ? Number(q.month) : null;    // 1..12
  const year  = q.year  ? Number(q.year)  : null;    // YYYY

  // Normalize end to inclusive (end-of-day)
  if (end) end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

  return rows.filter(r => {
    const d = getRowDate(r);
    if (!d) return false;

    if (start && d < start) return false;
    if (end && d > end) return false;

    if (month && (d.getMonth() + 1) !== month) return false;
    if (year && d.getFullYear() !== year) return false;

    return true;
  });
};


// normalize row keys to lowercase canonical keys (single-space sep) and normalize some values
const normalizeRows = (rows) => {
  return (rows || []).map(r => {
    const nr = {};

    Object.entries(r).forEach(([k, v]) => {
      // 1) canonicalize header key: lowercase, replace non-alnum with single space, trim
      let nk = (k || "").toString().trim().toLowerCase();
      nk = nk.replace(/[\u00A0\s\-_]+/g, " "); // replace underscores, dashes, multiple spaces, NBSP -> single space
      nk = nk.replace(/[^\w\s]/g, " "); // remove other punctuation
      nk = nk.replace(/\s+/g, " ").trim();

      // 2) unwrap BigQuery-style objects like { value: "2025-11-13" }
      let val = v;
      if (val && typeof val === "object" && Object.prototype.hasOwnProperty.call(val, "value")) {
        val = val.value;
      }

      // 3) normalize numeric-like strings: strip commas from numbers (e.g. "7,484" -> "7484")
      if (val !== null && val !== undefined && typeof val === "string") {
        // if string looks like a number with commas or digits
        if (/^[\d,\.\- ]+$/.test(val.trim())) {
          // remove commas and extra spaces
          val = val.replace(/,/g, "").trim();
        }
      }

      // 4) store normalized key/value
      nr[nk] = val;
    });

    // 5) alias common names to canonical keys used by controller
    // map "new date" -> "date", "timestamp" -> "time stamp", etc.
    if (nr["new date"] !== undefined && (nr["date"] === undefined || !nr["date"])) {
      nr["date"] = nr["new date"];
    }
    
    if (nr["timestamp"] !== undefined && (nr["time stamp"] === undefined || !nr["time stamp"])) {
      nr["time stamp"] = nr["timestamp"];
    }
    if (nr["stock_qty"] !== undefined && nr["stock qty"] === undefined) {
      nr["stock qty"] = nr["stock_qty"];
    }
    if (nr["stockqty"] !== undefined && nr["stock qty"] === undefined) {
      nr["stock qty"] = nr["stockqty"];
    }
    // also unify product name variants
    if (nr["product name"] === undefined && nr["productname"] !== undefined) {
      nr["product name"] = nr["productname"];
    }
    // ensure 'amount' exists and has commas stripped (we did above), keep as string/number friendly
    if (nr["amount"] !== undefined && typeof nr["amount"] === "string") {
      nr["amount"] = nr["amount"].trim();
    }

    return nr;
  });
};

// debug helper
const debugLogSample = (tag, obj, limit = 1) => {
  try {
    if (Array.isArray(obj)) {
      console.log(`[DBG] ${tag}: array length = ${obj.length}`);
      if (obj.length && limit > 0) console.log(`[DBG] ${tag} sample[0]:`, JSON.stringify(obj[0], null, 2));
    } else {
      console.log(`[DBG] ${tag}:`, JSON.stringify(obj, null, 2));
    }
  } catch (e) {
    console.log(`[DBG] ${tag}: (failed to stringify)`, obj);
  }
};



// produce an "empty" aggregate row for a product (so UI can show dashes)
const blankAgg = (name) => ({
  product: name,
  stockQty: null,
  q1: null,
  q2: null,
  rate: null,
  amount: null,
});


/* ---------- Controllers ---------- */

// NOTE: Important change: we now group top products by the "pl code" column
// so that the product-summary returns PL Codes (frontend selects PL Codes).

// Top dual table: group by PL Code, aggregate, then split by explicit lists
export const getProductSummary = async (req, res) => {
  try {
    console.log("[REQ] /product-summary query:", req.query);
    // before: const raw = await fetchSheetRows();
    const raw = await fetchSheetRows(); // fetch up to 2000 rows — adjust as needed
    const rows = normalizeRows(raw);
    debugLogSample("normalized rows (first)", rows, 1);


    const scoped = filterRowsByTime(rows, withDefaultMonthYear(req.query));
    debugLogSample("scoped after time filter", scoped, 1);

    const byPL = groupBy(scoped, "pl code");
    console.log("[DBG] grouped by 'pl code' keys:", Object.keys(byPL).slice(0, 10));

    const aggMap = Object.entries(byPL).reduce((acc, [plCode, list]) => {
      acc[plCode] = asAggRow({ product: plCode }, list);
      return acc;
    }, {});


    // ---------- KPI totals from RAW rows (your exact logic) ----------
    // left side  = rows where Amount < 0
    // right side = rows where Amount > 0
    const negativeRows = scoped.filter(r => toNum(r["amount"]) < 0);
    const positiveRows = scoped.filter(r => toNum(r["amount"]) > 0);

    const kpiTotals = {
      leftStockQty:  round2(sumBy(negativeRows, "stock qty")),
      leftAmount:    round2(sumBy(negativeRows, "amount")),
      rightStockQty: round2(sumBy(positiveRows, "stock qty")),
      rightAmount:   round2(sumBy(positiveRows, "amount")),
    };


    // --- dynamically classify PL Codes by aggregated amount (negative => left, positive/zero => right)
const allPlCodes = Object.keys(aggMap);

/* optional: preserve the original sheet order if you have a stable list from `byPL`
   (we used Object.keys(byPL) earlier) — but aggMap keys come from byPL anyway.
   If you want to sort by aggregated absolute amount descending, you could sort here.
*/
const leftFull = [];
const rightFull = [];
const neutral = []; // amounts === 0

for (const pl of allPlCodes) {
  const agg = aggMap[pl];
  const amt = toNum(agg.amount);
  if (amt < 0) leftFull.push(agg);
  else if (amt > 0) rightFull.push(agg);
  else neutral.push(agg);
}

// by default put zeros on the right so UI still receives left/right pairs
rightFull.push(...neutral);

// keep pairing logic so frontend still receives [ {left, right}, ... ]
const max = Math.max(leftFull.length, rightFull.length);
const pairs = Array.from({ length: max }).map((_, i) => ({ left: leftFull[i] || null, right: rightFull[i] || null }));

    debugLogSample("product-summary pairs (first)", pairs, 1);
    res.json({
      rows: pairs,
      kpiTotals,
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to build product summary" });
  }
};


// Types (grouping codes) for the selected PL Code
// frontend calls /types?plCode=<PL Code>
export const getTypesByProduct = async (req, res) => {
  try {
    const { plCode } = req.query;
    console.log("[REQ] /types query:", req.query);
    const raw = await fetchSheetRows();
    debugLogSample("raw from sheetsService (types)", raw, 1);
    const rows = normalizeRows(raw);
    debugLogSample("normalized rows (types)", rows, 1);

    const scoped = filterRowsByTime(rows, withDefaultMonthYear(req.query));
    debugLogSample("scoped after time filter (types)", scoped, 1);

    const filtered = scoped.filter(r => (r["pl code"] || "").toString().trim() === (plCode || "").toString().trim());
    console.log(`[DBG] types: filtered rows for plCode='${plCode}' count =`, filtered.length);
    if (filtered.length) debugLogSample("filtered[0] (types)", filtered[0]);

    const byGroup = groupBy(filtered, "grouping code");
    console.log("[DBG] grouped by 'grouping code' keys:", Object.keys(byGroup).slice(0, 20));

    const out = Object.entries(byGroup).map(([groupCode, list]) => asAggRow({ type: groupCode }, list));
    debugLogSample("type-wise out (first)", out, 1);
    res.json({ rows: out });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to build type-wise rows" });
  }
};


// Parties for selected PL Code + grouping code
// frontend calls /parties?plCode=...&groupCode=...
// Party values are taken from "product name" column (per new mapping)
export const getPartiesByType = async (req, res) => {
  try {
    const { plCode, groupCode } = req.query;
    console.log("[REQ] /parties query:", req.query);

    const raw = await fetchSheetRows();
    debugLogSample("raw from sheetsService (parties)", raw, 1);
    const rows = normalizeRows(raw);
    debugLogSample("normalized rows (parties)", rows, 1);

    const scoped = filterRowsByTime(rows, withDefaultMonthYear(req.query));
    debugLogSample("scoped after time filter (parties)", scoped, 1);

    const filtered = scoped.filter(r =>
      (r["pl code"] || "").toString().trim() === (plCode || "").toString().trim() &&
      (r["grouping code"] || "").toString().trim() === (groupCode || "").toString().trim()
    );
    console.log(`[DBG] parties: filtered count for plCode='${plCode}', groupCode='${groupCode}' =`, filtered.length);
    if (filtered.length) debugLogSample("filtered[0] (parties)", filtered[0]);

    const byParty = groupBy(filtered, "product name");
    console.log("[DBG] grouped by 'product name' keys (parties) sample:", Object.keys(byParty).slice(0, 20));

    const out = Object.entries(byParty).map(([productName, list]) => asAggRow({ party: productName }, list));
    debugLogSample("party-wise out (first)", out, 1);
    res.json({ rows: out });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to build party-wise rows" });
  }
};


// Invoice list (bottom): return FULL RAW ROWS with a stable column order
// frontend calls /invoices?productName=...&plCode=...&groupCode=...
export const getInvoices = async (req, res) => {
  try {
    const { plCode, groupCode, productName } = req.query;
    console.log("[REQ] /invoices query:", req.query);

    const raw = await fetchSheetRows();
    debugLogSample("raw from sheetsService (invoices)", raw, 1);
    const rows = normalizeRows(raw);
    debugLogSample("normalized rows (invoices)", rows, 1);

    const scoped = filterRowsByTime(rows, withDefaultMonthYear(req.query));
    debugLogSample("scoped after time filter (invoices)", scoped, 1);

    const filtered = scoped.filter(r =>
      (r["pl code"] || "").toString().trim() === (plCode || "").toString().trim() &&
      (r["grouping code"] || "").toString().trim() === (groupCode || "").toString().trim() &&
      (r["product name"] || "").toString().trim() === (productName || "").toString().trim()
    );
    console.log(`[DBG] invoices: filtered count for plCode='${plCode}', groupCode='${groupCode}', productName='${productName}' =`, filtered.length);
    if (filtered.length) debugLogSample("filtered[0] (invoices)", filtered[0]);

    // Build columns from the filtered row keys (normalized lowercase keys) so frontend gets matching keys.
    let columns = [];
    if (filtered.length) {
      // choose stable ordering: prefer common columns first if present, then rest
      const prefer = ["time stamp", "date", "name", "pl code", "grouping code", "product name", "bags", "quantity", "qnty", "rate", "amount", "remarks", "ratio", "stock qty"];
      const keys = Object.keys(filtered[0]).filter(k => k !== "_rowId");
      // keep order: prefer array order first, then append other keys
      const ordered = [];
      for (const p of prefer) if (keys.includes(p) && !ordered.includes(p)) ordered.push(p);
      for (const k of keys) if (!ordered.includes(k)) ordered.push(k);
      columns = ordered;
    } else {
      // fallback minimal set (lowercase)
      columns = ["time stamp", "date", "name", "pl code", "grouping code", "product name", "bags", "quantity", "qnty", "rate", "amount", "remarks", "ratio", "stock qty"];
    }
    console.log("[DBG] invoices columns ->", columns);

    const out = filtered.map((r, i) => ({ _rowId: i + 1, ...r }));
    res.json({ columns, rows: out });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to build invoice rows" });
  }
};




/* ----------- Opening Balance (PL Code: 'Opening Balance') ----------- */

export const getOpeningBalance = async (req, res) => {
  try {
    console.log("[REQ] /opening-balance");

    const raw = await fetchSheetRows();
    const rows = normalizeRows(raw);

    // Debug: see some PL Code values in server log
    const plValues = [...new Set(rows.map(r => (r["pl code"] || "").toString().trim()))];
    console.log("[DBG] PL Code values (sample):", plValues.slice(0, 30));

    // Make match more flexible:
    // - trim
    // - lowercase
    // - allow values that CONTAIN the words "opening balance"
    const candidates = rows.filter(r => {
      const v = (r["pl code"] || "").toString().trim().toLowerCase();
      if (!v) return false;
      return v === "opening balance" || v.includes("opening balance");
    });

    if (!candidates.length) {
      console.log("[DBG] No 'Opening Balance' PL Code row found");
      return res.json({ stockQty: 0, rate: 0 });
    }

    // If there are multiple rows, use the first one for now
    const obRow = candidates[0];

    const stock = toNum(obRow["stock qty"]);
    const rate  = toNum(obRow["rate"]);

    console.log("[DBG] Opening Balance row picked:", {
      plCode: obRow["pl code"],
      stock,
      rate,
    });

    res.json({
      stockQty: stock,
      rate: rate,
    });

  } catch (e) {
    console.error("Error in /opening-balance:", e);
    res.status(500).json({ error: "Failed to fetch opening balance" });
  }
};


/* ----------- Nagdi Tutra (PL Code: 'Nagdi Tutra') ----------- */

export const getNagdiTutra = async (req, res) => {
  try {
    console.log("[REQ] /nagdi-tutra", req.query);

    const raw = await fetchSheetRows();
    const rows = normalizeRows(raw);

    // apply same time filter as dashboard (month/year/date range)
    const scoped = filterRowsByTime(rows, withDefaultMonthYear(req.query));
    debugLogSample("scoped (nagdi tutra)", scoped, 1);

    // filter PL Code = 'Nagdi Tutra'
    const nagdiRows = scoped.filter(r =>
      (r["pl code"] || "").toString().trim().toLowerCase() === "nagdi tutra"
    );

    console.log("[DBG] nagdiRows length =", nagdiRows.length);

    const totalNagdi = round2(sumBy(nagdiRows, "amount"));

    res.json({ amount: totalNagdi });
  } catch (e) {
    console.error("Error in /nagdi-tutra:", e);
    res.status(500).json({ error: "Failed to fetch Nagdi Tutra amount" });
  }
};
