// src/pages/Dashboard.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import "../styles/dashboard.css";
import "../styles/rowTwo.css";
import "../styles/bottomPanel.css";
import "../styles/kpiPanel.css";

// use style-capable fork so .s styles are preserved
import * as XLSX from "xlsx-js-style";


// 👇 Add this line to read the backend base URL from frontend .env
// read base URL (Vite env) or fallback to backend API base

// frontend-safe number parser (same logic as backend toNum)
const safeNum = (v) => {
  if (v === null || v === undefined) return 0;
  const cleaned = String(v).replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "." || cleaned === "-" || cleaned === "-.") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};




// format time label from timeQS { start, end, month, year }
const formatTimeLabel = (timeQS = {}) => {
  if (!timeQS) return "";
  if (timeQS.start && timeQS.end) {
    const s = new Date(timeQS.start);
    const e = new Date(timeQS.end);
    const sL = `${s.getDate()} ${s.toLocaleString("default",{month:"short"})} ${s.getFullYear()}`;
    const eL = `${e.getDate()} ${e.toLocaleString("default",{month:"short"})} ${e.getFullYear()}`;
    return `${sL} → ${eL}`;
  }
  if (timeQS.month && timeQS.year) {
    const monthName = new Date(timeQS.year, timeQS.month - 1).toLocaleString("default", { month: "long" });
    return `${monthName} ${timeQS.year}`;
  }
  if (timeQS.year) return `Year ${timeQS.year}`;
  // fallback: current month
  const now = new Date();
  return `${now.toLocaleString("default",{month:"long"})} ${now.getFullYear()}`;
};

// safe cell formatter for export
const exportFmt = (v) => (v === null || v === undefined || v === "" ? "-" : v);

// utility: force download workbook
const downloadWorkbook = (wb, filename) => {
  XLSX.writeFile(wb, filename);
};

// ---------- Styled Excel helpers (SheetJS) - Colourful + Frozen Header ----------
function createStyledSheet(aoa, opts = {}) {
  const { sheetName = "Sheet1", merges = [], cols = [], theme: themeKey = "violet", headerLabels } = opts;
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // apply merges
  ws['!merges'] = ws['!merges'] || [];
  for (const m of merges) {
    if (!m) continue;
    if (typeof m === "string") ws['!merges'].push(XLSX.utils.decode_range(m));
    else ws['!merges'].push(m);
  }

  // set column widths
  if (cols && cols.length) ws['!cols'] = cols;

  // --- theme colors per panel
  const themeColors = {
    violet:  { heading: "FF5A2D6D", time: "FF8B5FA8", headerBg: "FFD6C8E6", headerFont: "FF1E2138" }, // product
    indigo:  { heading: "FF1E2A78", time: "FF5E72C9", headerBg: "FFD6E0FF", headerFont: "FF1E2138" }, // type
    emerald: { heading: "FF106D5B", time: "FF35C8A4", headerBg: "FFD6FFF3", headerFont: "FF1E2138" }, // party
    rose:    { heading: "FF661E34", time: "FFB06B7F", headerBg: "FFF6D6DA", headerFont: "FF1E2138" }  // invoice
  };
  const theme = themeColors[themeKey] || themeColors.violet;

  // helpers
  function applyStyleTo(r, c, style) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const val = (aoa[r] && aoa[r][c] != null) ? aoa[r][c] : "";
    if (!ws[addr]) ws[addr] = { t: typeof val === "number" ? "n" : "s", v: val };
    ws[addr].s = { ...(ws[addr].s || {}), ...style };
  }

  const thinBorder = {
    top: { style: "thin", color: { rgb: "FFBBBBBB" } },
    bottom: { style: "thin", color: { rgb: "FFBBBBBB" } },
    left: { style: "thin", color: { rgb: "FFBBBBBB" } },
    right: { style: "thin", color: { rgb: "FFBBBBBB" } },
  };

  const headingStyle = {
    font: { name: "Calibri", sz: 16, bold: true, color: { rgb: "FFFFFFFF" } },
    fill: { fgColor: { rgb: theme.heading } },
    alignment: { horizontal: "center", vertical: "center" }
  };
  const timeStyle = {
    font: { name: "Calibri", sz: 11, italic: true, color: { rgb: "FFFFFFFF" } },
    fill: { fgColor: { rgb: theme.time } },
    alignment: { horizontal: "center", vertical: "center" }
  };
  const headerStyle = {
    font: { name: "Calibri", sz: 11, bold: true, color: { rgb: theme.headerFont } },
    fill: { fgColor: { rgb: theme.headerBg } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true }
  };
  const dataStyle = {
    font: { name: "Calibri", sz: 11, color: { rgb: "FF000000" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  // header row index (0-based)
  const headerRowIndex = 3;
  const colCount = (aoa[headerRowIndex] && aoa[headerRowIndex].length) || (aoa[0] && aoa[0].length) || 8;

  // If headerLabels passed, overwrite AO A header row (index 3)
  if (Array.isArray(headerLabels) && headerLabels.length) {
    aoa[headerRowIndex] = headerLabels.slice(0, Math.max(headerLabels.length, colCount));
    // re-generate sheet cells for that row
    for (let c = 0; c < aoa[headerRowIndex].length; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c });
      const val = aoa[headerRowIndex][c] != null ? aoa[headerRowIndex][c] : "";
      ws[addr] = { t: typeof val === "number" ? "n" : "s", v: val };
    }
  }

  // ensure cells exist across AO A
  for (let r = 0; r < aoa.length; r++) {
    for (let c = 0; c < (aoa[r] ? aoa[r].length : colCount); c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const val = (aoa[r] && aoa[r][c] != null) ? aoa[r][c] : "";
      if (!ws[addr]) ws[addr] = { t: typeof val === "number" ? "n" : "s", v: val };
    }
  }

  // heading row (row 0)
  if (aoa[0]) {
    for (let c = 0; c < colCount; c++) applyStyleTo(0, c, { ...headingStyle, border: thinBorder });
  }
  // time row (row 1)
  if (aoa[1]) {
    for (let c = 0; c < colCount; c++) applyStyleTo(1, c, { ...timeStyle, border: thinBorder });
  }
  // header row (row 3)
  if (aoa[headerRowIndex]) {
    for (let c = 0; c < aoa[headerRowIndex].length; c++) {
      applyStyleTo(headerRowIndex, c, { ...headerStyle, border: thinBorder });
    }
  }

  // data rows style + numeric detection
  for (let r = headerRowIndex + 1; r < aoa.length; r++) {
    for (let c = 0; c < (aoa[r] ? aoa[r].length : colCount); c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const raw = aoa[r] && aoa[r][c];
      const stringVal = raw == null ? "" : String(raw).trim();
      const numCandidate = stringVal !== "" && !isNaN(Number(stringVal.replace(/,/g, '')));

      if (numCandidate) {
        const val = Number(stringVal.replace(/,/g, ''));
        ws[addr].t = 'n';
        ws[addr].v = Number.isFinite(val) ? val : 0;
        ws[addr].z = '#,##0.00';
        ws[addr].s = {
          ...(ws[addr].s || {}),
          font: dataStyle.font,
          alignment: { horizontal: "right", vertical: "center" },
          border: thinBorder
        };
      } else {
        ws[addr].t = 's';
        ws[addr].v = stringVal;
        ws[addr].s = { ...(ws[addr].s || {}), ...dataStyle, border: thinBorder };
      }
    }
  }

  // Freeze panes
  const topLeft = XLSX.utils.encode_cell({ r: headerRowIndex + 1, c: 0 }); // e.g., A5
  ws['!sheetViews'] = [{
    pane: {
      xSplit: 0,
      ySplit: headerRowIndex + 1,
      topLeftCell: topLeft,
      activePane: "bottomLeft",
      state: "frozen"
    },
    selection: [{ pane: "bottomLeft", activeCell: topLeft, sqref: topLeft }]
  }];

  return { ws, sheetName };
}

function downloadStyledWorkbookFromAoA(aoa, opts = {}) {
  const { ws, sheetName, freezeView } = createStyledSheet(aoa, opts);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Re-attach freeze pane to the appended sheet (important quirk)
  const targetSheet = wb.Sheets[sheetName];
  if (freezeView) targetSheet['!sheetViews'] = freezeView;

  const filename = opts.filename || `${sheetName}.xlsx`;
  XLSX.writeFile(wb, filename);
}







function DualProductTable({ rows = [], onProductClick, activeProduct }) {
  // rows is an array of { left?: productRow, right?: productRow }
  // productRow: { product, stockQty, q1, q2, rate, amount }
  const fmt = (v) => (v === null || v === undefined || v === "" ? "-" : v);

  return (
    <div className="row-two__table-wrap">
      <table className="row-two__table">
        <colgroup>
          {/* Left block: 6 cols */}
          <col className="col-type" />
          <col className="col-num" />
          <col className="col-num" />
          <col className="col-num" />
          <col className="col-num" />
          <col className="col-amt" />
          {/* Right block: 6 cols */}
          <col className="col-type" />
          <col className="col-num" />
          <col className="col-num" />
          <col className="col-num" />
          <col className="col-num" />
          <col className="col-amt" />
        </colgroup>

        <thead>
          <tr>
            <th className="sticky-head">Product Name</th>
            <th>Stock Qty</th>
            <th>Quantity-1</th>
            <th>Quantity-2</th>
            <th>Rate</th>
            <th>Amount</th>

            <th className="sticky-head">Product Name</th>
            <th>Stock Qty</th>
            <th>Quantity-1</th>
            <th>Quantity-2</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={12} style={{ textAlign: "center", padding: 24 }}>
                No products to show
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
                {/* LEFT CELL GROUP */}
                {row.left ? (
                  <>
                    <td>
                      <button
                        type="button"
                        className={`cell-pill cell-type cell-click ${activeProduct === row.left.product ? "is-active" : ""}`}
                        onClick={() => onProductClick && onProductClick(row.left.product)}
                        title="Load type-wise details"
                      >
                        {row.left.product}
                      </button>
                    </td>
                    <td><div className="cell-pill">{fmt(row.left.stockQty)}</div></td>
                    <td><div className="cell-pill">{fmt(row.left.q1)}</div></td>
                    <td><div className="cell-pill">{fmt(row.left.q2)}</div></td>
                    <td><div className="cell-pill">{fmt(row.left.rate)}</div></td>
                    <td><div className="cell-pill cell-right">{fmt(row.left.amount)}</div></td>

                  </>
                ) : (
                  // 6 empty cells if no left
                  Array.from({ length: 6 }).map((_, idx) => <td key={`l${idx}`} />)
                )}

                {/* RIGHT CELL GROUP */}
                {row.right ? (
                  <>
                    <td>
                      <button
                        type="button"
                        className={`cell-pill cell-type cell-click ${activeProduct === row.right.product ? "is-active" : ""}`}
                        onClick={() => onProductClick && onProductClick(row.right.product)}
                        title="Load type-wise details"
                      >
                        {row.right.product}
                      </button>
                    </td>
                    <td><div className="cell-pill">{fmt(row.right.stockQty)}</div></td>
                    <td><div className="cell-pill">{fmt(row.right.q1)}</div></td>
                    <td><div className="cell-pill">{fmt(row.right.q2)}</div></td>
                    <td><div className="cell-pill">{fmt(row.right.rate)}</div></td>
                    <td><div className="cell-pill cell-right">{fmt(row.right.amount)}</div></td>

                  </>
                ) : (
                  // 6 empty cells if no right
                  Array.from({ length: 6 }).map((_, idx) => <td key={`r${idx}`} />)
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ===== Sticky table for Row Two (Left) ===== */
function StickyStatsTable({ rows = [], onTypeClick, activeType }) {
  return (
    <div className="row-two__table-wrap">
      <table className="row-two__table">
        {/* Set min column widths for horizontal scroll */}
        <colgroup>
          <col className="col-type" />
          <col className="col-num" />
          <col className="col-num" />
          <col className="col-num" />
          <col className="col-num" />
          <col className="col-amt" />
        </colgroup>

        <thead>
          <tr>
            <th className="sticky-col sticky-head">Type</th>
            <th>Stock Qty</th>
            <th>Quantity-1</th>
            <th>Quantity-2</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="sticky-col" colSpan={6} style={{ textAlign: "center", padding: "24px" }}>
                No data available for this selection / time period
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr
                key={r.type + i}
                className="row-click"
                onClick={() => onTypeClick && onTypeClick(r.type)}
              >
                <td className="sticky-col">
                  <button
                    type="button"
                    className={`cell-pill cell-type cell-click ${activeType === r.type ? "is-active" : ""}`}
                    title="Show party-wise details"
                  >
                    {r.type}
                  </button>
                </td>
                <td><div className="cell-pill">{r.stockQty}</div></td>
                <td><div className="cell-pill">{r.q1}</div></td>
                <td><div className="cell-pill">{r.q2}</div></td>
                <td><div className="cell-pill">{r.rate}</div></td>
                <td><div className="cell-pill cell-right">{r.amount}</div></td>
              </tr>

            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ===== Right panel table (Party-wise) ===== */
function StickyPartyTable({ rows = [], onPartyClick, activeParty }) {
  return (
    <div className="row-two__table-wrap">
      <table className="row-two__table">
        <colgroup>
          <col className="col-type"/>  {/* sticky col: Party Wise */}
          <col className="col-num"/>
          <col className="col-num"/>
          <col className="col-num"/>
          <col className="col-num"/>
          <col className="col-amt"/>
        </colgroup>

        <thead>
          <tr>
            <th className="sticky-col sticky-head">Party Wise</th>
            <th>Stock Qty</th>
            <th>Quantity-1</th>
            <th>Quantity-2</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="sticky-col" colSpan={6} style={{ textAlign: "center", padding: "24px" }}>
                {`Click a Type on the left to view party-wise details`}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr
                key={r.party + i}
                className="row-click"
                onClick={() => onPartyClick && onPartyClick(r.party)}
              >
                <td className="sticky-col">
                  <button
                    type="button"
                    className={`cell-pill cell-type cell-click ${activeParty === r.party ? "is-active" : ""}`}
                    title="Show invoices"
                  >
                    {r.party}
                  </button>
                </td>

                <td><div className="cell-pill">{r.stockQty}</div></td>
                <td><div className="cell-pill">{r.q1}</div></td>
                <td><div className="cell-pill">{r.q2}</div></td>
                <td><div className="cell-pill">{r.rate}</div></td>
                <td><div className="cell-pill cell-right">{r.amount}</div></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}


 /* ===== Bottom big card: Invoice-wise list (dynamic full-row) ===== */
function StickyInvoiceTable({ columns = [], rows = [] }) {
  // Optional: pretty display labels (capitalize). You can map to exact Sheet labels if you prefer.
  const label = (k) => {
    // Map to your exact casing if you want:
    const map = {
      "time stamp": "Time Stamp",
      "date": "Date",
      "name": "Name",
      "pl code": "PL Code",
      "grouping code": "Grouping Code",
      "product name": "Product Name",
      "bags": "Bags",
      "quantity": "Quantity",
      "qnty": "Qnty",
      "rate": "Rate",
      "amount": "Amount",
      "type": "Type",
      "remarks": "Remarks",
      "ratio": "Ratio",
      "stock qty": "Stock Qty",
    };

    return map[k] || k;
  };

  return (
    <div className="row-two__table-wrap">
      <table className="row-two__table">
        <thead>
          <tr>
            {/* optional index col */}
            <th className="sticky-col sticky-head">#</th>
            {columns.map((c) => (
              <th key={c}>{label(c)}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="sticky-col" colSpan={columns.length + 1} style={{ textAlign: "center", padding: 24 }}>
                Click a <b>Party</b> on the right to view invoices
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={(r._rowId ?? i) + "-" + (r["remarks"] || "")}>
                <td className="sticky-col">
                  <div className="cell-pill cell-type">{i + 1}</div>
                </td>
                {columns.map((c) => (
                  <td key={c}>
                    <div className="cell-pill">
                      {r[c] ?? ""}
                    </div>
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}



export default function Dashboard({ selectedView, timeQS  }) {
  // 🔧 For now using demo values; you'll replace these from your API/selection.
const view = selectedView || null;
// selectedPL = PL Code (was selectedPL)
// selectedGroup = Grouping Code (was selectedGroup)
// selectedProductName = Product Name (used for party/invoice filtering)
const [selectedPL, setSelectedPL] = useState(null);
const [selectedGroup, setSelectedGroup] = useState(null);
const [selectedProductName, setSelectedProductName] = useState(null);



/// When PL (product box) changes => clear Group & ProductName
useEffect(() => {
  setSelectedGroup(null);
  setSelectedProductName(null);
}, [selectedPL]);

// When Grouping Code changes => clear selectedProductName
useEffect(() => {
  setSelectedProductName(null);
}, [selectedGroup]);




// ---------- DATA FROM API ----------
const [dualProductRows, setDualProductRows] = useState([]); // top dual table
const [tableRows, setTableRows] = useState([]);             // type-wise
const [partyRows, setPartyRows] = useState([]);             // party-wise
const [invoiceCols, setInvoiceCols] = useState([]); // << new
const [invoiceRows, setInvoiceRows] = useState([]);         // invoices
const [loading, setLoading] = useState(false);
const [err, setErr] = useState("");

// Opening / Closing balance state
const [openingData, setOpeningData] = useState({
  stockQty: 0,
  rate: 0,
});
const [openingRate, setOpeningRate] = useState(null); // editable input (defaults from sheet)
const [closingRate, setClosingRate] = useState(null); // editable input (defaults from opening rate)

const [nagdiAmount, setNagdiAmount] = useState(0);    // Nagdi Tutra total (from backend)




// KPI totals: based on product details (dualProductRows)
const kpiTotals = useMemo(() => {
  let negStock = 0, negAmt = 0; // Left side (Amount < 0)
  let posStock = 0, posAmt = 0; // Right side (Amount > 0)

  dualProductRows.forEach(pair => {
    const sides = [pair.left, pair.right];
    sides.forEach(p => {
      if (!p) return;
      const amt = safeNum(p.amount);
      const stock = safeNum(p.stockQty);

      if (amt < 0) {
        negAmt += amt;
        negStock += stock;
      } else if (amt > 0) {
        posAmt += amt;
        posStock += stock;
      }
      // amt === 0 is ignored for both sides
    });
  });

  return {
    leftStockQty: negStock,
    leftAmount: negAmt,
    rightStockQty: posStock,
    rightAmount: posAmt,
  };
}, [dualProductRows]);

// simple formatter for KPI numbers
const fmtKpi = (v) => {
  if (!v) return "-"; // show "-" when 0 / null
  return Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
};


// Opening Amount = Opening Stock * Opening Rate (rate is editable)
const openingAmount = useMemo(() => {
  const stock = safeNum(openingData.stockQty);
  const rate = safeNum(
    openingRate !== null && openingRate !== undefined
      ? openingRate
      : openingData.rate
  );
  return stock * rate;
}, [openingData.stockQty, openingData.rate, openingRate]);

// Closing Stock = Right Stock - Left Stock - Opening Stock
const closingStockQty = useMemo(() => {
  const right = safeNum(kpiTotals.rightStockQty);
  const left = safeNum(kpiTotals.leftStockQty);
  const openingStock = safeNum(openingData.stockQty);
  return right - left - openingStock;
}, [kpiTotals.rightStockQty, kpiTotals.leftStockQty, openingData.stockQty]);

// Closing Amount = Closing Stock * Closing Rate (editable, default = openingRate)
const closingAmount = useMemo(() => {
  const stock = safeNum(closingStockQty);
  const rate = safeNum(
    closingRate !== null && closingRate !== undefined
      ? closingRate
      : (openingRate !== null && openingRate !== undefined
          ? openingRate
          : openingData.rate)
  );
  return stock * rate;
}, [closingStockQty, closingRate, openingRate, openingData.rate]);


// P & L for the period = (Closing Amount + Nagdi Tutra Amount) - Opening Amount
const plAmount = useMemo(() => {
  const nagdi = safeNum(nagdiAmount);
  return closingAmount + nagdi - openingAmount;
}, [closingAmount, nagdiAmount, openingAmount]);


// Build a URL with the global time filter + any extra params
const withQS = (base, extra = {}) => {
  const q = new URLSearchParams();
  const merged = { ...(timeQS || {}), ...(extra || {}) };
  Object.entries(merged).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.append(k, v);
  });
  const qs = q.toString();
  return qs ? (base.includes("?") ? `${base}&${qs}` : `${base}?${qs}`) : base;
};



const selectedPLRef = useRef(selectedPL);
useEffect(() => { selectedPLRef.current = selectedPL; }, [selectedPL]);





// 1) Load top product pairs on mount
useEffect(() => {
  let alive = true;
  setLoading(true);

  fetch(withQS(`/api/product-summary`))
    .then(r => r.json())
    .then(j => {
      if (!alive) return;
      const rows = j.rows || [];
      setDualProductRows(rows);

      // check current selection using ref to avoid dependency loop
      const currentSel = selectedPLRef.current;
      if (currentSel) {
        const allPls = rows.flatMap(p => [p.left && p.left.product, p.right && p.right.product].filter(Boolean));
        if (!allPls.includes(currentSel)) {
          setSelectedPL(null);
        }
      }
    })
    .catch(e => setErr(String(e)))
    .finally(() => alive && setLoading(false));

  return () => { alive = false; };
}, [timeQS]); // <-- only timeQS



// 1b) Load Opening Balance (from PL Code 'Opening Balance')
useEffect(() => {
  let alive = true;

  fetch(withQS(`/api/opening-balance`))
    .then(r => r.json())
    .then(j => {
      if (!alive) return;
      const stock = safeNum(j.stockQty);
      const rate = safeNum(j.rate);

      setOpeningData({ stockQty: stock, rate });

      // set default editable rates
      setOpeningRate(rate);
      setClosingRate(rate);
    })
    .catch(e => {
      console.error("Failed to load opening balance", e);
      // don't break UI, just log + keep previous
    });

  return () => { alive = false; };
}, [timeQS]);



// 👇 NEW: 1c) Load Nagdi Tutra amount (PL Code 'Nagdi Tutra')
useEffect(() => {
  let alive = true;

  fetch(withQS(`/api/nagdi-tutra`))
    .then(r => r.json())
    .then(j => {
      if (!alive) return;
      setNagdiAmount(safeNum(j.amount || 0));
    })
    .catch(e => {
      console.error("Failed to load Nagdi Tutra amount", e);
    });

  return () => { alive = false; };
}, [timeQS]);


// 2) When a product is selected, load type-wise rows
useEffect(() => {
  if (!selectedPL) { setTableRows([]); return; }
  let alive = true;
  setLoading(true);
    // request grouping codes for the selected PL
    fetch(withQS(`/api/types`, { plCode: selectedPL }))
    .then(r => r.json())
    .then(j => { if (alive) setTableRows(j.rows || []); })
    .catch(e => setErr(String(e)))
    .finally(() => alive && setLoading(false));
  return () => { alive = false; };
}, [selectedPL, timeQS]);


// 3) When a grouping is selected, load party-wise rows (party values come from sheet's Product Name column)
useEffect(() => {
  if (!selectedPL || !selectedGroup) { setPartyRows([]); return; }
  let alive = true;
  setLoading(true);

  fetch(withQS(`/api/parties`, { plCode: selectedPL, groupCode: selectedGroup }))
    .then(r => r.json())
    .then(j => { if (alive) setPartyRows(j.rows || []); })
    .catch(e => setErr(String(e)))
    .finally(() => alive && setLoading(false));

  return () => { alive = false; };
}, [selectedPL, selectedGroup, timeQS]);



// 4) When a party is selected, load invoice rows
useEffect(() => {
  if (!selectedPL || !selectedGroup || !selectedProductName) { setInvoiceRows([]); return; }
  let alive = true;
  setLoading(true);
  fetch(withQS(`/api/invoices`, { 
    plCode: selectedPL,
    groupCode: selectedGroup,
    productName: selectedProductName
  }))


    .then(r => r.json())
    .then(j => {
      if (!alive) return;
      setInvoiceCols(j.columns || []);
      setInvoiceRows(j.rows || []);
  })

    .catch(e => setErr(String(e)))
    .finally(() => alive && setLoading(false));
  return () => { alive = false; };
}, [selectedPL, selectedGroup, selectedProductName, timeQS]);







// Build product-sheet and download
const exportProducts = (rows) => {
  const timeLabel = formatTimeLabel(timeQS);
  const heading = "Product Details";

  const header = [
    "Left Product", " Stock Qty", " Quantity-1", " Quantity-2", " Rate", " Amount",
    "Right Product", " Stock Qty", " Quantity-1", " Quantity-2", " Rate", " Amount"
  ];

  const data = rows.map(pair => {
    const L = pair.left || {};
    const R = pair.right || {};
    return [
      L.product || "",
      exportFmt(L.stockQty),
      exportFmt(L.q1),
      exportFmt(L.q2),
      exportFmt(L.rate),
      exportFmt(L.amount),
      R.product || "",
      exportFmt(R.stockQty),
      exportFmt(R.q1),
      exportFmt(R.q2),
      exportFmt(R.rate),
      exportFmt(R.amount),
    ];
  });

  const aoa = [
    [heading],
    [`Time period: ${timeLabel}`],
    [],
    header,
    ...data
  ];

  const merges = ["A1:L1", "A2:L2"];
  const cols = [
    { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
  ];

  const filename = `${heading.replace(/\s+/g,"_")}_${timeLabel.replace(/[^\w\-]+/g,"_")}.xlsx`;
  downloadStyledWorkbookFromAoA(aoa, { sheetName: "Products", merges, cols, filename, theme: "violet", headerLabels: header });
};


// Build Type-wise sheet and download
const exportTypes = (rows) => {
  const timeLabel = formatTimeLabel(timeQS);
  const heading = `Type Wise Details ${selectedPL ? `— ${selectedPL}` : ""}`;

  const header = ["Type","Stock Qty","Quantity-1","Quantity-2","Rate","Amount"];
  const data = rows.map(r => [
    r.type || "",
    exportFmt(r.stockQty),
    exportFmt(r.q1),
    exportFmt(r.q2),
    exportFmt(r.rate),
    exportFmt(r.amount),
  ]);

  const aoa = [
    [heading],
    [`Time period: ${timeLabel}`],
    [],
    header,
    ...data
  ];

  const merges = ["A1:F1","A2:F2"];
  const cols = [{wch:24},{wch:12},{wch:12},{wch:12},{wch:10},{wch:12}];
  const filename = `${heading.replace(/\s+/g,"_")}_${timeLabel.replace(/[^\w\-]+/g,"_")}.xlsx`;

  downloadStyledWorkbookFromAoA(aoa, { sheetName: "Types", merges, cols, filename, theme: "indigo", headerLabels: header});
};


// Build Party-wise sheet and download
const exportParties = (rows) => {
  const timeLabel = formatTimeLabel(timeQS);
  const heading = `Party Wise Details ${selectedPL ? `— ${selectedPL}` : ""}${selectedGroup ? ` — ${selectedGroup}` : ""}`;

  const header = ["Party","Stock Qty","Quantity-1","Quantity-2","Rate","Amount"];
  const data = rows.map(r => [
    r.party || r.name || "",
    exportFmt(r.stockQty),
    exportFmt(r.q1),
    exportFmt(r.q2),
    exportFmt(r.rate),
    exportFmt(r.amount),
  ]);

  const aoa = [
    [heading],
    [`Time period: ${timeLabel}`],
    [],
    header,
    ...data
  ];

  const merges = ["A1:F1","A2:F2"];
  const cols = [{wch:30},{wch:12},{wch:12},{wch:12},{wch:10},{wch:12}];
  const filename = `${heading.replace(/\s+/g,"_")}_${timeLabel.replace(/[^\w\-]+/g,"_")}.xlsx`;

  downloadStyledWorkbookFromAoA(aoa, { sheetName: "Parties", merges, cols, filename,theme: "emerald", headerLabels: header });
};


// Build Invoice sheet and download
const exportInvoices = (columns, rows) => {
  const timeLabel = formatTimeLabel(timeQS);
  const heading = `Invoices ${selectedPL ? `— ${selectedPL}` : ""}${selectedGroup ? ` — ${selectedGroup}` : ""}${selectedProductName ? ` — ${selectedProductName}` : ""}`;

  const header = ["#"].concat(columns.map(c => c));
  const data = rows.map((r, i) => [i + 1].concat(columns.map(c => {
    const v = r[c];
    return (v === null || v === undefined || v === "") ? "-" : v;
  })));

  const aoa = [
    [heading],
    [`Time period: ${timeLabel}`],
    [],
    header,
    ...data
  ];

  // create merges dynamically across number of columns
  const lastColLetter = XLSX.utils.encode_col(header.length - 1); // 0-indexed -> col letter
  const merges = [`A1:${lastColLetter}1`, `A2:${lastColLetter}2`];

  // basic column widths: index col + each column wch=18
  const cols = [{wch:6}, ...Array(header.length - 1).fill({wch:18})];
  const filename = `${heading.replace(/\s+/g,"_")}_${timeLabel.replace(/[^\w\-]+/g,"_")}.xlsx`;

  downloadStyledWorkbookFromAoA(aoa, { sheetName: "Invoices", merges, cols, filename, theme: "rose", headerLabels: header });
};









 
return (
 <div className="page">    
    {/* existing content... */}

    {err && <div className="card" style={{padding:12, color:"#f66"}}>Error: {err}</div>}
    {loading && <div className="card" style={{padding:12}}>Loading…</div>}
        
    {/* ---------- New KPI panel (placed above Product Details) ---------- */}
    <section className="kpi-panel" aria-label="Top KPI panel">
      <div className="kpi-panel__inner">

        {/* big header inside the white card */}
        <div className="kpi-panel__title">
          <h2>KPI Section</h2>
        </div>

        {/* top large box (blue/indigo -> teal) - Summation Area */}
          <div className="kpi-row kpi-box__meta">
            {/* two columns (left / right) with two metrics each */}
            <div className="summation-columns">
              <div className="summation-column" aria-label="Left summary">
                <div className="summation-col-title">Left Side</div>
                <div className="summation-metrics">
                  <div className="summation-metric">
                    <div className="metric-label">Stock Qty</div>
                    <div className="metric-value">{fmtKpi(kpiTotals.leftStockQty)}</div>
                  </div>
                  <div className="summation-metric">
                    <div className="metric-label">Amount</div>
                    <div className="metric-value">{fmtKpi(kpiTotals.leftAmount)}</div>
                  </div>
                </div>
              </div>


              <div className="summation-column" aria-label="Right summary">
                <div className="summation-col-title">Right Side</div>
                <div className="summation-metrics">
                  <div className="summation-metric">
                    <div className="metric-label">Stock Qty</div>
                    <div className="metric-value">{fmtKpi(kpiTotals.rightStockQty)}</div>
                  </div>
                  <div className="summation-metric">
                    <div className="metric-label">Amount</div>
                    <div className="metric-value">{fmtKpi(kpiTotals.rightAmount)}</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
          

        {/* middle box showing one-row Opening / Closing balances */}
          <div className="kpi-row balances-row">
              {/* Opening Balance (left) */}
              <div className="balance-group balance-group--opening" aria-label="Opening panel">
                <div className="balance-heading">Opening Balance</div>

                <table className="balance-table" aria-label="Opening balance">
                  <thead>
                    <tr>
                      <th>Stock Qty</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {/* Stock Qty from sheet (not editable) */}
                      <td className="val pill">
                        {fmtKpi(openingData.stockQty)}
                      </td>

                      {/* Rate: default from sheet, but editable by user */}
                      <td className="val pill">
                        <input
                          type="number"
                          className="kpi-input"
                          value={openingRate ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setOpeningRate(v === "" ? null : Number(v));
                          }}
                        />
                      </td>

                      {/* Amount = Stock Qty * Rate */}
                      <td className="val pill">
                        {fmtKpi(openingAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="balance-spacer" aria-hidden="true" />

              {/* Closing Balance (right) */}
              <div className="balance-group balance-group--closing" aria-label="Closing panel">
                <div className="balance-heading">Closing Balance</div>

                <table className="balance-table" aria-label="Closing balance">
                  <thead>
                    <tr>
                      <th>Stock Qty</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {/* Closing Stock Qty = Right Stock - Left Stock - Opening Stock */}
                      <td className="val pill">
                        {fmtKpi(closingStockQty)}
                      </td>

                      {/* Rate: defaults from Opening Rate, editable separately */}
                      <td className="val pill">
                        <input
                          type="number"
                          className="kpi-input"
                          value={closingRate ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setClosingRate(v === "" ? null : Number(v));
                          }}
                        />
                      </td>

                      {/* Amount = Closing Stock * Closing Rate */}
                      <td className="val pill">
                        {fmtKpi(closingAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>

              </div>
          </div>

        {/* bottom row with two smaller boxes (muted) */}
        <div className="kpi-bottom-row">
          <div className="kpi-box kpi-box--small kpi-box--muted">
            <div className="mini-info">
              <div className="mini-info__label">P &amp; L for the period</div>
              <div className="mini-info__amount">
                <div className="mini-info__amount-title">Amount</div>
                <div className="mini-info__amount-value">{fmtKpi(plAmount)}</div>
              </div>
            </div>
          </div>

          <div className="kpi-box kpi-box--small kpi-box--muted">
            <div className="mini-info">
              <div className="mini-info__label">Nagdi Tutra</div>
              <div className="mini-info__amount">
                <div className="mini-info__amount-title">Amount</div>
                <div className="mini-info__amount-value">{fmtKpi(nagdiAmount)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>




    <section className="product-panel panel--violet">
      <div className="product-panel__header">
        <h3>
          Product Details {selectedPL ? `—  ${selectedPL}` : ""}
        </h3>
        <button
            className="export-btn"
            onClick={() => exportProducts(dualProductRows)}
            title="Export Product Details to Excel"
            aria-label="Export Product Details"
          >
            <span className="export-icon" aria-hidden="true">
              {/* Elegant export/download SVG */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
                <path d="M4 21h16" />
              </svg>
            </span>
            <span>Export</span>
          </button>
      </div>
      <div className="product-panel__body">
        <DualProductTable
          rows={dualProductRows}
          onProductClick={setSelectedPL}
          activeProduct={selectedPL}
        />
      </div>
    </section>


    {/* <KpiBar title={view} data={kpiValues} /> */}

    {/* === Two soft panels under KPI (Row Two) === */}
    <div className="row-two">
      <div className="row-two__grid">



        <section className="row-two__panel panel--indigo">
          <div className="row-two__header">
            <h3>Type Wise Details {selectedPL ? `— ${selectedPL}` : ""}</h3>

            <button
              className="export-btn"
              onClick={() => exportTypes(tableRows)}
              title="Export Type-wise to Excel"
              aria-label="Export Type-wise"
            >
              <span className="export-icon" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
                  <path d="M4 21h16" />
                </svg>
              </span>
              <span>Export</span>
            </button>
          </div>
          <div className="row-two__body">
              <StickyStatsTable
                rows={tableRows}
                onTypeClick={setSelectedGroup}
                activeType={selectedGroup}
              />
          </div>
        </section>

        <section className="row-two__panel panel--emerald">
          <div className="row-two__header">
            <h3>Party Wise Details {selectedGroup ? `— ${selectedGroup}` : ""}</h3>
            <button
              className="export-btn"
              onClick={() => exportParties(partyRows)}
              title="Export Party-wise to Excel"
              aria-label="Export Party-wise"
            >
              <span className="export-icon" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
                  <path d="M4 21h16" />
                </svg>
              </span>
              <span>Export</span>
            </button>
          </div>
          <div className="row-two__body">
            <StickyPartyTable
              rows={partyRows}
              onPartyClick={setSelectedProductName}
              activeParty={selectedProductName}
            />
          </div>
        </section>


      </div>
    </div>
    {/* === /Row Two === */}

    {/* === Full width large panel (Bottom Panel) === */}
    <section className="bottom-panel panel--rose">
      <div className="bottom-panel__header">
        <h3>
          Invoices {selectedGroup ? `— ${selectedGroup}` : ""} {selectedProductName ? `— ${selectedProductName}` : ""}
        </h3>
        <button
          className="export-btn"
          onClick={() => exportInvoices(invoiceCols, invoiceRows)}
          title="Export Invoices to Excel"
          aria-label="Export Invoices"
        >
          <span className="export-icon" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
              <path d="M4 21h16" />
            </svg>
          </span>
          <span>Export</span>
        </button>

      </div>
      <div className="bottom-panel__body">
        <StickyInvoiceTable columns={invoiceCols} rows={invoiceRows} />
      </div>
    </section>

    {/* === /Bottom Panel === */}

    

  </div>
);
}
