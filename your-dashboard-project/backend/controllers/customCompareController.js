// backend/controllers/customCompareController.js
const { fetchSheetRows } = require("../services/sheetsService");

/* ---------- helpers (same style as dashboardController) ---------- */
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

// Date parsing & selection helpers (same logic as dashboardController)
const toDate = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  const d1 = new Date(s);
  if (!isNaN(d1)) return d1;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = Number(m[1]), mm = Number(m[2]) - 1, yyyy = Number(m[3] < 100 ? 2000 + Number(m[3]) : m[3]);
    const d = new Date(yyyy, mm, dd);
    if (!isNaN(d)) return d;
  }
  return null;
};
const getRowDate = (r) => toDate(r["date"]) || toDate(r["time stamp"]);

function withDefaultMonthYear(q = {}) {
  const hasAny =
    (q.start && q.start.trim && q.start.trim()) ||
    (q.end && q.end.trim && q.end.trim()) ||
    q.month !== undefined ||
    q.year !== undefined;
  if (hasAny) return q;
  const today = new Date();
  return { ...q, month: today.getMonth() + 1, year: today.getFullYear() };
}

const filterRowsByTime = (rows, q) => {
  let start = q.start ? new Date(q.start) : null;
  let end   = q.end   ? new Date(q.end)   : null;
  const month = q.month ? Number(q.month) : null;
  const year  = q.year  ? Number(q.year) : null;

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

// normalize row keys to lower-case trimmed keys (same as dashboard)
const normalizeRows = (rows) => {
  return (rows || []).map(r => {
    const nr = {};
    Object.entries(r).forEach(([k, v]) => {
      const nk = (k || "").toString().trim().toLowerCase();
      nr[nk] = v;
    });
    return nr;
  });
};

// aggregator per product (same fields as frontend expects)
const asAggRowMinimal = (name, list) => ({
  product: name,
  stockQty: round2(sumBy(list, "stock qty")),
  qty1:     round2(sumBy(list, "qnty")),
  qty2:     round2(sumBy(list, "quantity")),
  rate:     Number(avgBy(list, "rate").toFixed(2)),
  amount:   round2(sumBy(list, "amount")),
});

// blank aggregate: return nulls so frontend shows "-" using its fmt()
const blankAgg = (name) => ({
  product: name,
  stockQty: null,
  qty1: null,
  qty2: null,
  rate: null,
  amount: null,
});

/* ---------- Controllers ---------- */

// GET /api/month/items
// Return unique product names (read directly from sheet product column(s))
// This helps the frontend display items in stable order if needed.
exports.getItemsFromSheet = async (req, res) => {
  try {
    console.log("[REQ] GET /month/items");
    const raw = await fetchSheetRows();
    const rows = normalizeRows(raw);

    // prefer columns in this order: "product name", "product", "name"
    const candidates = rows.map(r => (r["pl code"]  || "").toString().trim()).filter(Boolean);

    // preserve sheet order and dedupe
    const uniq = [];
    const seen = new Set();
    for (const it of candidates) {
      if (!seen.has(it)) { seen.add(it); uniq.push(it); }
    }

    res.json({ items: uniq });
  } catch (e) {
    console.error("Error in /month/items:", e);
    res.status(500).json({ error: "Failed to fetch items from sheet" });
  }
};

// POST /api/month/custom-compare
// Body: { left: { start, end }, right: { start, end }, items?: [ ... ] }
// Returns: { leftSummary, rightSummary, rows: [ { item, left:{...}, right:{...} } ] }
exports.postCustomCompare = async (req, res) => {
  try {
    console.log("[REQ] POST /month/custom-compare", JSON.stringify(req.body).slice(0,400));
    const { left, right, items } = req.body || {};

    if (!left || !left.start || !left.end || !right || !right.start || !right.end) {
      return res.status(400).json({ error: "Both left and right ranges must be provided (start/end)" });
    }

    const raw = await fetchSheetRows();
    const rows = normalizeRows(raw);

    // filter per side
    const leftScoped = filterRowsByTime(rows, { start: left.start, end: left.end });
    const rightScoped = filterRowsByTime(rows, { start: right.start, end: right.end });

    // group by product name (fallback to other product columns if product name missing)
    const leftByProduct = {};
    for (const r of leftScoped) {
      const key = (r["pl code"] || "").toString().trim();
      if (!key) continue;
      (leftByProduct[key] ||= []).push(r);
    }

    const rightByProduct = {};
    for (const r of rightScoped) {
      const key = (r["pl code"] || "").toString().trim();
      if (!key) continue;
      (rightByProduct[key] ||= []).push(r);
    }

    // build summary maps
    const leftSummary = {};
    for (const [product, list] of Object.entries(leftByProduct)) {
      leftSummary[product] = asAggRowMinimal(product, list);
    }
    const rightSummary = {};
    for (const [product, list] of Object.entries(rightByProduct)) {
      rightSummary[product] = asAggRowMinimal(product, list);
    }

    // ordering: use items from request if provided; else union of keys preserving sheet order
    let orderedItems = Array.isArray(items) && items.length ? items.slice() : [];
    if (!orderedItems.length) {
      // preserve first-seen order from full sheet
      const sheetProducts = rows.map(r => (r["pl code"] || "").toString().trim()).filter(Boolean);
      const seen = new Set();
      for (const p of sheetProducts) {
        if (!seen.has(p)) { seen.add(p); orderedItems.push(p); }
      }
      // ensure we include any product that only appears in filtered sets but not in full scan (unlikely)
      for (const p of Object.keys(leftSummary).concat(Object.keys(rightSummary))) {
        if (!seen.has(p)) { seen.add(p); orderedItems.push(p); }
      }
    }

    // build merged rows
    const mergedRows = orderedItems.map(it => ({
      item: it,
      left: leftSummary[it] || blankAgg(it),
      right: rightSummary[it] || blankAgg(it),
    }));

    res.json({ leftSummary, rightSummary, rows: mergedRows });
  } catch (e) {
    console.error("Error in /month/custom-compare:", e);
    res.status(500).json({ error: "Failed to run custom compare" });
  }
};
