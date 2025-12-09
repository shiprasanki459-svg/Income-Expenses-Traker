// backend/controllers/monthlyComparisonController.js
const { fetchSheetRows } = require("../services/sheetsService");

/* small helpers copied from your dashboardController style */
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

const DEFAULT_ROWS = [
  "Sales of Rice","Sales Return Rice","CMR Revenue","Sales of Bran","Sales of Husk",
  "Sales of DORB","Sales of Motakuro","Sales of Scrap","Sales of Reject Bag","Misc Income",
  "Purchase of Paddy","Purchase of Re Rice","Purchase of Rice","Purchase Return Paddy","Paddy Bata",
  "Purchase of CMR Paddy","Purchase of Wheat","Broken Rice Palviser","Purchase of Store","Purchase of Bag",
  "Bank Charges","Insurance","Marketing Fee","Salary & wages","GST Expenses","Bank Interest",
  "SIDBI Bank","Advance Income tax","Freight","Lorry Expenses","Daily Expenses","Monthly Expenses",
  "CMR Expenses","Manufactureing Expenses","Admin Expenses","Brokarage","Deisel","Misc Expenses"
];

const DEFAULT_MONTHS = ["April","May","June","July","August","September","October","November","December","January","February","March"];

/* reuse your date parsing helper logic from dashboardController */
/* For simplicity paste the same toDate / getRowDate functions (or import from common util if you have one) */
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

function monthNameFromDate(d) {
  if (!d) return null;
  // map JS month -> your custom months (April..March)
  const m = d.getMonth(); // 0..11 (Jan..Dec)
  // Build mapping where index 0 -> April
  const mapping = {
    3: "April", 4: "May", 5: "June", 6: "July", 7: "August", 8: "September",
    9: "October", 10: "November", 11: "December", 0: "January", 1: "February", 2: "March"
  };
  return mapping[m] || null;
}

function normalizeRows(rows) {
  return (rows || []).map(r => {
    const nr = {};
    Object.entries(r).forEach(([k, v]) => {
      const nk = (k || "").toString().trim().toLowerCase();
      nr[nk] = v;
    });
    return nr;
  });
}
exports.getMonthlyComparison = async (req, res) => {
  try {
    const raw = await fetchSheetRows();
    const rows = normalizeRows(raw);

    // 1) Build DYNAMIC label list from sheet (PL Code / Product Name)
    // ---------------------------
      // Tolerant label extraction + ordering (replaces previous labelSet logic)
      // ---------------------------

      /**
       * Helper: tolerant accessor for different header variants.
       * - r: normalized row object (keys lowercased by your normalizeRows)
       * - names: array of possible key names to try (lowercase, without punctuation)
       */
      function getField(r, names = []) {
        if (!r) return "";
        for (const n of names) {
          // try exact key first (keys are lowercased by normalizeRows)
          if (r[n] !== undefined && r[n] !== null) {
            return String(r[n]).trim();
          }
          // also try stripped variants (no spaces/underscores)
          const compact = n.replace(/[^a-z0-9]/g, "");
          for (const k of Object.keys(r)) {
            const kk = k.replace(/[^a-z0-9]/g, "");
            if (kk === compact && r[k] !== undefined && r[k] !== null) {
              return String(r[k]).trim();
            }
          }
        }
        return "";
      }

      // Normalizes label text for stable comparisons (lowercase + remove non-alnum)
      function normLabel(s) {
        return (s || "").toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
      }

      /* Build DYNAMIC label list from sheet (PL Code / Product Name) */
      const labelSet = new Set();

      for (const r of rows) {
        // try multiple header variants
        const plRaw = getField(r, ["pl code", "plcode", "pl_code", "pl", "pl-code"]);
        const pnameRaw = getField(r, ["product name", "productname", "product_name", "product", "item", "item name"]);

        if (plRaw) {
          labelSet.add(plRaw);
        } else if (pnameRaw) {
          labelSet.add(pnameRaw);
        }
      }

      // Order: prefer DEFAULT_ROWS ordering but only keep existing ones
      const labels = [];
      const tmp = new Set(Array.from(labelSet)); // copy

      for (const pref of DEFAULT_ROWS) {
        // match pref to set using normalized comparison
        const match = Array.from(tmp).find(x => normLabel(x) === normLabel(pref));
        if (match) {
          labels.push(match); // use actual original text from sheet when possible
          tmp.delete(match);
        }
      }

      // remaining labels sorted (use original text but sort by normalized key)
      const remaining = Array.from(tmp).sort((a, b) => {
        const na = normLabel(a), nb = normLabel(b);
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
      labels.push(...remaining);


    // 2) Initialise data map for [label][month]
    const data = {};
    for (const label of labels) {
      data[label] = {};
      for (const m of DEFAULT_MONTHS) {
        data[label][m] = null;  // default null -> frontend shows "-"
      }
    }

    // 3) Fill cells: group each sheet row into (label, month)
    for (const r of rows) {
      const d = getRowDate(r);
      if (!d) continue;

      const mon = monthNameFromDate(d);
      if (!mon) continue;

           // robustly read product / pl fields (handles header name variants)
      const pname = getField(r, ["product name", "productname", "product_name", "product", "item", "item name"]) || "";
      const plcode = getField(r, ["pl code", "plcode", "pl_code", "pl", "pl-code"]) || "";

      // tolerant label matching (normalised)
      const labelRaw = plcode || pname;
      if (!labelRaw) continue;

      const labelKey = labels.find(lbl => normLabel(lbl) === normLabel(labelRaw));
      if (!labelKey) continue;

      if (!data[labelKey][mon]) data[labelKey][mon] = { rows: [] };
      data[labelKey][mon].rows.push(r);
    }

    // 4) Reduce each cell to { qty, rate, amount }
    for (const label of labels) {
      for (const m of DEFAULT_MONTHS) {
        const cell = data[label][m];
        if (!cell || !cell.rows || !cell.rows.length) {
          data[label][m] = null;
          continue;
        }
        const list = cell.rows;

        const qtySum    = sumBy(list, "stock qty");   // your chosen qty source
        const rateAvg   = avgBy(list, "rate");
        const amountSum = sumBy(list, "amount");

        data[label][m] = {
          qty:    qtySum === 0 ? null : round2(qtySum),
          rate:   rateAvg ? Number(rateAvg.toFixed(2)) : null,
          amount: amountSum === 0 ? null : round2(amountSum),
        };
      }
    }

    // 5) Return dynamic rows instead of fixed DEFAULT_ROWS
    res.json({
      rows: labels,              // <-- dynamic item names
      months: DEFAULT_MONTHS,
      data,
    });
  } catch (e) {
    console.error("monthlyComparison error:", e);
    res.status(500).json({ error: "Failed to build monthly comparison" });
  }
};


