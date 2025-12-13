// src/components/CompareMonth.jsx
import React, { useEffect, useState } from "react";
import { fetchMonthlyComparison } from "../api/sheetApi";
import "./../styles/monthlyComparison.css";

/**
 * MonthlyComparison component
 *
 * - Renders a large scrollable comparison table with sticky first column and sticky headers.
 * - Each month has three sub-columns: Qty | Rate | Amount.
 * - Amount is taken from data if present; otherwise computed as qty * rate and formatted.
 * - If no `rows` or `data` props are passed, the component will use built-in sample rows and sampleData
 *   so you can drop this file in and see the table working immediately.
 *
 * Props:
 * - rows: array of row labels (strings) - optional (defaults to fixed list)
 * - months: array of 12 month names in display order - optional (defaults Apr->Mar)
 * - data: object { [rowLabel]: { [month]: { qty, rate, amount? } } } - optional
 * - title: string - optional
 *
 * Usage:
 * <MonthlyComparison />                     // uses built-in rows/sampleData
 * <MonthlyComparison rows={rows} data={data} />
 */

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



function formatNumber(v, opts = {}) {
  if (v === "-" || v === undefined || v === null || v === "") return "-";
  const n = Number(String(v).replace(/,/g, ""));
  if (!Number.isFinite(n)) return String(v);
  if (opts.decimals === 0) return n.toLocaleString();
  return n.toLocaleString(undefined, { minimumFractionDigits: opts.decimals ?? 2, maximumFractionDigits: opts.decimals ?? 2 });
}


// Fiscal year helper: April–March
function getYearForMonth(monthName, baseYear) {
  // baseYear = fiscal year start (April's year), e.g. 2025 for FY 2025–26
  const clean = (monthName || "").toString().trim();
  const idx = DEFAULT_MONTHS.indexOf(clean); // 0..11 (April..March)

  if (idx === -1) return baseYear || new Date().getFullYear();

  // April..December (indexes 0..8) belong to baseYear,
  // January..March (indexes 9..11) belong to baseYear + 1
  if (idx <= 8) return baseYear;
  return baseYear + 1;
}


export default function MonthlyComparison({ rows = [], months, data = {}, title = "Monthly Comparison", timeQS = {} }) {
    // --- state & fetch (use API if no `data` prop passed) ---
  const [rowsState, setRowsState] = useState(Array.isArray(rows) && rows.length ? rows : DEFAULT_ROWS);
  const [monthsState, setMonthsState] = useState(months && months.length === 12 ? months : DEFAULT_MONTHS);
  const [dataState, setDataState] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (data && Object.keys(data).length) {
      setDataState(data);
      if (Array.isArray(rows) && rows.length) setRowsState(rows);
      if (months && months.length === 12) setMonthsState(months);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const json = await fetchMonthlyComparison(timeQS || {}, { signal: controller.signal });
        if (cancelled) return;
        if (json.rows && Array.isArray(json.rows) && json.rows.length) setRowsState(json.rows);
        if (json.months && Array.isArray(json.months) && json.months.length === 12) setMonthsState(json.months);
        if (json.data && typeof json.data === "object") setDataState(json.data);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("fetchMonthlyComparison failed:", err);
        setError(err.message || "Failed to fetch monthly comparison");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [rows, months, data, JSON.stringify(timeQS)]);

    // ALIASES used by the rest of the file (keeps UI code unchanged)
  const rowsToUse = rowsState;
  const monthsToUse = monthsState;
  const dataToUse = dataState || {};

  
  // fiscal-year start year, driven by filter (fallback = current year)
  const fiscalStartYear = (() => {
    const y = Number(timeQS.year);
    return Number.isFinite(y) ? y : new Date().getFullYear();
  })();
  // returns "-" or formatted value
  const getCell = (row, month, key) => {
    const entry = dataToUse[row] && dataToUse[row][month];
    if (!entry) return "-";

    if (key === "amount") {
      // explicit amount
      if (entry.amount !== undefined && entry.amount !== null && entry.amount !== "") return formatNumber(entry.amount);
      // compute from qty * rate
      const q = entry.qty;
      const rt = entry.rate;
      if (q === undefined || q === null || q === "" || rt === undefined || rt === null || rt === "") return "-";
      const qn = Number(String(q).replace(/,/g, ""));
      const rn = Number(String(rt).replace(/,/g, ""));
      if (!Number.isFinite(qn) || !Number.isFinite(rn)) return "-";
      return formatNumber(qn * rn);
    }

    // qty or rate
    const val = entry[key];
    if (val === undefined || val === null || val === "") return "-";
    if (key === "qty") return formatNumber(val, { decimals: Number.isInteger(Number(val)) ? 0 : 2 });
    if (key === "rate") return formatNumber(val, { decimals: 2 });
    return String(val);
  };

  // Export CSV including amount
  const exportCsv = () => {
    const header = ["Item", ...monthsToUse.flatMap(m => [`${m} Qty`, `${m} Rate`, `${m} Amount`])];
    const rowsCsv = [header.join(",")];

    for (const r of rowsToUse) {
      const cells = [`"${r.replace(/"/g, '""')}"`];
      for (const m of monthsToUse) {
        const q = getCell(r, m, "qty");
        const rt = getCell(r, m, "rate");
        const am = getCell(r, m, "amount");
        // remove commas inside numbers for CSV numeric fields (optional)
        const sanitize = (v) => (v === "-" ? "" : String(v).replace(/,/g, ""));
        cells.push(sanitize(q), sanitize(rt), sanitize(am));
      }
      rowsCsv.push(cells.join(","));
    }

    const blob = new Blob([rowsCsv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (


    <div className="mc-card">
      
     
      <div className="mc-header">
        <h3>{title}</h3>
        <div className="mc-controls">
          <button
            className="export-btn"
            onClick={exportCsv}
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
      </div>

      <div className="mc-table-wrap">
        <table className="mc-table" role="table" aria-label={title}>
          <thead>
            <tr className="mc-head-months">
              <th className="mc-sticky-first" rowSpan={2}>Item</th>
                {monthsToUse.map(m => {
                  const monthClass = m.toLowerCase().replace(/\s+/g, "-");
                  const yr = getYearForMonth(m, fiscalStartYear);

                  return (
                    <th key={m} colSpan={3} className={`mc-month ${monthClass}`}>
                      {m} <span className="mc-month-year">{yr}</span>
                    </th>
                  );
                })}
            </tr>
            <tr className="mc-head-sub">
              {monthsToUse.map(m => (
                <React.Fragment key={m + "-sub"}>
                  <th className="mc-sub">Qty</th>
                  <th className="mc-sub">Rate</th>
                  <th className="mc-sub">Amount</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {rowsToUse.map((r, idx) => (
              <tr key={r + idx} className="mc-row">
                <td className="mc-sticky-first mc-item">{r}</td>
                {monthsToUse.map(m => (
                  <React.Fragment key={r + m}>
                    <td className="mc-cell">{getCell(r, m, "qty")}</td>
                    <td className="mc-cell">{getCell(r, m, "rate")}</td>
                    <td className="mc-cell">{getCell(r, m, "amount")}</td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
