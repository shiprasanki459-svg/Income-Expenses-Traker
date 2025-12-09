// src/pages/CustomComparison.jsx
import React, { useEffect, useState } from "react";
import "../styles/customComparison.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function CustomComparison() {
  // date ranges for left and right
  const [leftStart, setLeftStart] = useState("");
  const [leftEnd, setLeftEnd] = useState("");
  const [rightStart, setRightStart] = useState("");
  const [rightEnd, setRightEnd] = useState("");

  const [loading, setLoading] = useState(false);

  // items = list of item names fetched from PL sheet (product box)
  // rows = UI rows merged with left/right aggregates
  const [items, setItems] = useState([]); 
  const [rows, setRows] = useState([]); // each row: { item, left: {...}, right: {...} }
  const [err, setErr] = useState("");

  // load item list once on mount
  useEffect(() => {
    let alive = true;
    (async function fetchItems() {
      try {
        const r = await fetch(`${API}/month/items`);
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();

        // Accept either j.items = ["a","b"] or j.rows with product property
        const list = Array.isArray(j.items)
          ? j.items
          : (Array.isArray(j.rows)
              ? j.rows.map(x => x.product || x.item || x.name).filter(Boolean)
              : []);

        if (!alive) return;
        setItems(list);

        // initialize rows (empty left/right) preserving order
        const initialRows = list.map((it) => ({
          item: it,
          left: { stockQty: "-", qty1: "-", qty2: "-", rate: "-", amount: "-" },
          right: { stockQty: "-", qty1: "-", qty2: "-", rate: "-", amount: "-" },
        }));
        setRows(initialRows);
      } catch (e) {
        console.error("fetchItems error", e);
        if (alive) setErr("Failed to load item list: " + String(e));
      }
    })();

    return () => { alive = false; };
  }, []);

  // helper to format values in UI
  const fmt = (v) => (v === null || v === undefined || v === "" ? "-" : v);

  // Run comparison: ask backend for both left & right aggregated summaries
  const runComparison = async () => {
    setErr("");
    if (!leftStart || !leftEnd || !rightStart || !rightEnd) {
      setErr("Please choose start and end for both sides.");
      return;
    }
    if (new Date(leftEnd) < new Date(leftStart) || new Date(rightEnd) < new Date(rightStart)) {
      setErr("End must be same or after Start for each side.");
      return;
    }

    setLoading(true);
    try {
      // pass items to server to guarantee ordering + include items with zeroes
      const payload = {
        left: { start: leftStart, end: leftEnd },
        right: { start: rightStart, end: rightEnd },
        items: items, // optional but recommended
      };

      const resp = await fetch(`${API}/month/custom-compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "Server error");
      }

      const data = await resp.json();

      // Preferred server response shape:
      // { leftSummary: { "Sales of Rice": {...} }, rightSummary: { ... }, rows: optional merged rows }
      // If server gives `rows` (already merged), use that (but ensure every item present in UI order).
      if (Array.isArray(data.rows) && data.rows.length) {
        // Ensure we preserve client items order (items may include extra ordering)
        const merged = items.map((it) => {
          const found = data.rows.find((r) => r.item === it) || {};
          return {
            item: it,
            left: found.left || { stockQty: "-", qty1: "-", qty2: "-", rate: "-", amount: "-" },
            right: found.right || { stockQty: "-", qty1: "-", qty2: "-", rate: "-", amount: "-" },
          };
        });
        setRows(merged);
      } else {
        const leftSummary = data.leftSummary || {};
        const rightSummary = data.rightSummary || {};

        const merged = items.map((it) => ({
          item: it,
          left: leftSummary[it] || { stockQty: "-", qty1: "-", qty2: "-", rate: "-", amount: "-" },
          right: rightSummary[it] || { stockQty: "-", qty1: "-", qty2: "-", rate: "-", amount: "-" },
        }));

        setRows(merged);
      }
    } catch (e) {
      console.error("runComparison error", e);
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  // number of columns (1 item + 5 left + 5 right)
  const totalCols = 11;

  return (
    <div className="page">
      <section className="cc-panel panel--violet">
        <div className="cc-panel__header">
          <h3>Customised Comparison</h3>
        </div>

        <div className="cc-panel__body">
          <div className="cc-table-wrap">
            <table className="cc-table">
              <colgroup>
                <col className="cc-col-item" />
                <col className="cc-col-left-stock" />
                <col className="cc-col-left-q1" />
                <col className="cc-col-left-q2" />
                <col className="cc-col-left-rate" />
                <col className="cc-col-left-amt" />
                <col className="cc-col-right-stock" />
                <col className="cc-col-right-q1" />
                <col className="cc-col-right-q2" />
                <col className="cc-col-right-rate" />
                <col className="cc-col-right-amt" />
              </colgroup>

              <thead>
                <tr>
                  <th rowSpan={2} className="cc-sticky-col cc-sticky-head">Item</th>

                  <th colSpan={5} className="cc-header-left">
                    <div className="cc-compare-header__inner">
                      <div className="cc-compare-header__title">Left</div>
                      <div className="cc-compare-header__dates">
                        <input type="date" value={leftStart} onChange={(e) => setLeftStart(e.target.value)} />
                        <span className="cc-dash">—</span>
                        <input type="date" value={leftEnd} onChange={(e) => setLeftEnd(e.target.value)} />
                      </div>
                    </div>
                  </th>

                  <th colSpan={5} className="cc-header-right">
                    <div className="cc-compare-header__inner">
                      <div className="cc-compare-header__title">Right</div>
                      <div className="cc-compare-header__dates">
                        <input type="date" value={rightStart} onChange={(e) => setRightStart(e.target.value)} />
                        <span className="cc-dash">—</span>
                        <input type="date" value={rightEnd} onChange={(e) => setRightEnd(e.target.value)} />
                      </div>
                    </div>
                  </th>
                </tr>

                <tr>
                  <th className="cc-subhead">Stock Qty</th>
                  <th className="cc-subhead">Qty-1</th>
                  <th className="cc-subhead">Qty-2</th>
                  <th className="cc-subhead">Rate</th>
                  <th className="cc-subhead">Amount</th>

                  <th className="cc-subhead">Stock Qty</th>
                  <th className="cc-subhead">Qty-1</th>
                  <th className="cc-subhead">Qty-2</th>
                  <th className="cc-subhead">Rate</th>
                  <th className="cc-subhead">Amount</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="cc-sticky-col" colSpan={totalCols} style={{ textAlign: "center", padding: 20 }}>
                      Loading…
                    </td>
                  </tr>
                ) : err ? (
                  <tr>
                    <td className="cc-sticky-col" colSpan={totalCols} style={{ textAlign: "center", padding: 20, color: "crimson" }}>
                      {err}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="cc-sticky-col" colSpan={totalCols} style={{ textAlign: "center", padding: 24 }}>
                      Loading items... or define both date ranges above and click <b>Compare</b>.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={(r.item || "") + i} className="cc-row-click">
                      <td className="cc-sticky-col">
                        <div className="cc-cell-pill cc-cell-type">{r.item}</div>
                      </td>

                      <td><div className="cc-cell-pill">{fmt(r.left?.stockQty)}</div></td>
                      <td><div className="cc-cell-pill">{fmt(r.left?.qty1)}</div></td>
                      <td><div className="cc-cell-pill">{fmt(r.left?.qty2)}</div></td>
                      <td><div className="cc-cell-pill">{fmt(r.left?.rate)}</div></td>
                      <td><div className="cc-cell-pill">{fmt(r.left?.amount)}</div></td>

                      <td><div className="cc-cell-pill">{fmt(r.right?.stockQty)}</div></td>
                      <td><div className="cc-cell-pill">{fmt(r.right?.qty1)}</div></td>
                      <td><div className="cc-cell-pill">{fmt(r.right?.qty2)}</div></td>
                      <td><div className="cc-cell-pill">{fmt(r.right?.rate)}</div></td>
                      <td><div className="cc-cell-pill">{fmt(r.right?.amount)}</div></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="cc-actionbar">
            <button className="cc-export-btn" onClick={runComparison} disabled={loading}>
              {loading ? "Working…" : "Compare"}
            </button>
            <div style={{ marginLeft: 12, color: "#9aa" }}>
              <small>Choose both ranges and click Compare to fetch aggregated totals for each side.</small>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
