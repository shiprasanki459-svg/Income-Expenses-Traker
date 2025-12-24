// backend/controllers/bankController.js
const { fetchBankSheetRows } = require("../services/bankSheetsService");

/* ------------- Helpers ------------- */
const toNum = (v) => {
  if (v === null || v === undefined) return 0;

  const s = String(v).trim();
  if (!s) return 0;

  // Detect accounting negative like (123.45)
  const isParenNegative = /^\(.*\)$/.test(s);

  // Remove commas, parentheses, spaces
  const cleaned = s.replace(/[(),\s]/g, "");

  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;

  return isParenNegative ? -n : n;
};


// normalize sheet row keys
const normalizeRows = (rows) =>
  rows.map((r) => {
    const n = {};
    for (const [k, v] of Object.entries(r)) {
      n[k.trim().toLowerCase()] = v;
    }
    return n;
  });

// date parsing
const toDate = (raw) => {
  if (!raw) return null;

  const s = String(raw).trim();

  // Handle DD-MM-YY or DD/MM/YY
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (m1) {
    const dd = Number(m1[1]);
    const mm = Number(m1[2]) - 1;
    const yy = 2000 + Number(m1[3]);
    return new Date(yy, mm, dd);
  }

  // Handle DD-MM-YYYY
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m2) {
    const dd = Number(m2[1]);
    const mm = Number(m2[2]) - 1;
    const yyyy = Number(m2[3]);
    return new Date(yyyy, mm, dd);
  }

  // ISO fallback (YYYY-MM-DD)
  const d = new Date(s);
  return isNaN(d) ? null : d;
};


const getRowDate = (r) => toDate(r["date"]) || toDate(r["time stamp"]);

// default month/year when no filter provided
function withDefaultMonthYear(q) {
  // 🔥 if date range is present, NEVER inject month/year
  if (q.start || q.end) return q;

  if (q.month || q.year) return q;

  const t = new Date();
  return { ...q, month: t.getMonth() + 1, year: t.getFullYear() };
}


// filter rows based on date
const filterRowsByTime = (rows, q) => {
  let { start, end, month, year } = q;

  // 🔥 Date range overrides month/year
  if (start || end) {
    month = null;
    year = null;
  }

  let s = null;
  let e = null;

  if (start) {
    const sd = new Date(start);
    s = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate(), 0, 0, 0);
  }

  if (end) {
    const ed = new Date(end);
    e = new Date(ed.getFullYear(), ed.getMonth(), ed.getDate(), 23, 59, 59);
  }

  month = month ? Number(month) : null;
  year = year ? Number(year) : null;

  return rows.filter((r) => {
    const d = getRowDate(r);
    if (!d) return false;

    if (s && d < s) return false;
    if (e && d > e) return false;

    if (month && d.getMonth() + 1 !== month) return false;
    if (year && d.getFullYear() !== year) return false;

    return true;
  });
};





/* ----------------------------------------------
   1) PRODUCT SUMMARY (top panel)
   Group by: GROUPING CODE
   Return: dual table (left/right pairs)
   ---------------------------------------------- */
exports.getProductSummary = async (req, res) => {
  try {
    const raw = await fetchBankSheetRows();
    const rows = normalizeRows(raw);

    const scoped = filterRowsByTime(rows, withDefaultMonthYear(req.query));

    const groups = {};
    for (const r of scoped) {
      const key = (r["bs code"] || "").trim();
      if (!key) continue;
      groups[key] = (groups[key] || 0) + toNum(r["amount"]);
    }

    // separate into negative / positive for dual table display
    const left = [];
    const right = [];

    for (const [group, amt] of Object.entries(groups)) {
      const row = { product: group, amount: amt };
      if (amt < 0) left.push(row);
      else right.push(row);
    }

    const max = Math.max(left.length, right.length);
    const pairs = Array.from({ length: max }).map((_, i) => ({
      left: left[i] || null,
      right: right[i] || null,
    }));

    res.json({ rows: pairs });
  } catch (e) {
    console.error("Error in getProductSummary:", e);
    res.status(500).json({ error: "Failed to build product summary" });
  }
};

/* ----------------------------------------------
   2) TYPE-WISE DETAILS
   Group by: PRODUCT NAME (col D)
   Filter by: GROUPING CODE (col C)
   ---------------------------------------------- */
exports.getTypes = async (req, res) => {
  try {
    const { plCode, groupCode } = req.query;

    // plCode comes from frontend as the selected Grouping Code
    const groupingCode = (plCode || groupCode || "").trim();

    const raw = await fetchBankSheetRows();
    const rows = normalizeRows(raw);

    const scoped = filterRowsByTime(rows, withDefaultMonthYear(req.query));

    // keep only rows for this Grouping Code
    const filtered = scoped.filter(
      (r) => (r["bs code"] || "").trim() === groupingCode
    );


    // group by PRODUCT NAME
    const groups = {};
    for (const r of filtered) {
      const key = (r["grouping code"] || "").trim();
      if (!key) continue;
      groups[key] = (groups[key] || 0) + toNum(r["amount"]);
    }

    const out = Object.entries(groups).map(([type, amt]) => ({
      type,        // shown in the "Type Wise" table
      amount: amt,
    }));

    res.json({ rows: out });
  } catch (e) {
    console.error("Error in getTypes:", e);
    res.status(500).json({ error: "Failed to build type-wise rows" });
  }
};

/* ----------------------------------------------
   3) PARTY-WISE DETAILS
   Group by: NAME (party, col E)
   Filter by: GROUPING CODE (C) + PRODUCT NAME (D)
   ---------------------------------------------- */
exports.getParties = async (req, res) => {
  try {
    const { plCode, groupCode, type } = req.query;

    // From frontend:
    //  plCode      = selected Grouping Code (top box)
    //  groupCode   = selected Product Name (middle left)
    const groupingCode = (plCode || "").trim();
    const productName = (groupCode || type || "").trim(); // support old "type" if ever used

    const raw = await fetchBankSheetRows();
    const rows = normalizeRows(raw);

    const scoped = filterRowsByTime(rows, withDefaultMonthYear(req.query));

    // filter rows for this Grouping Code + Product Name
    const filtered = scoped.filter(
      (r) =>
        (r["bs code"] || "").trim() === groupingCode &&
        (r["grouping code"] || "").trim() === productName
    );

    // group by NAME (party column)
    const groups = {};
    for (const r of filtered) {
      const key = (r["name"] || "").trim();
      if (!key) continue;
      groups[key] = (groups[key] || 0) + toNum(r["amount"]);
    }

    const out = Object.entries(groups).map(([party, amt]) => ({
      party,       // shown in "Party Wise" table
      amount: amt,
    }));

    res.json({ rows: out });
  } catch (e) {
    console.error("Error in getParties:", e);
    res.status(500).json({ error: "Failed to build party-wise rows" });
  }
};

/* ----------------------------------------------
   4) INVOICES (full raw rows)
   Filter by: GROUPING CODE (C) + PRODUCT NAME (D) + NAME (E)
   ---------------------------------------------- */
exports.getInvoices = async (req, res) => {
  try {
    const { plCode, groupCode, productName, type, party } = req.query;

    // From frontend:
    //  plCode        = Grouping Code (top)
    //  groupCode     = Product Name (middle left)
    //  productName   = Party Name (middle right)
    const groupingCode = (plCode || "").trim();
    const prodName = (groupCode || type || "").trim();
    const partyName = (productName || party || "").trim();

    const raw = await fetchBankSheetRows();
    const rows = normalizeRows(raw);

    const scoped = filterRowsByTime(rows, withDefaultMonthYear(req.query));

    const filtered = scoped.filter(
      (r) =>
        (r["bs code"] || "").trim() === groupingCode &&
        (r["grouping code"] || "").trim() === prodName &&
        (r["name"] || "").trim() === partyName
    );

    let columns = [];
    if (filtered.length) {
      columns = Object.keys(filtered[0]).filter((k) => k !== "_rowId");
    }

    const out = filtered.map((r, i) => ({ _rowId: i + 1, ...r }));
    res.json({ columns, rows: out });
  } catch (e) {
    console.error("Error in getInvoices:", e);
    res.status(500).json({ error: "Failed to build invoice rows" });
  }
};
