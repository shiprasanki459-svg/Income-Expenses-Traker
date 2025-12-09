// src/pages/BankStatement.jsx
import React, { useState, useEffect, useRef } from "react";
import "../styles/dashboard.css";
import "../styles/rowTwo.css";
import "../styles/bottomPanel.css";
import "../styles/bankPage.css";


const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
// NOTE: new backend controller will be mounted under /api/bank
const BANK_API = `${API}/bank`;

/* ----------------- Small helpers ----------------- */

// Attach global time filter query string
const withQS = (base, extra = {}, timeQS = {}) => {
  const q = new URLSearchParams();
  const merged = { ...(timeQS || {}), ...(extra || {}) };
  Object.entries(merged).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.append(k, v);
  });
  const qs = q.toString();
  return qs ? (base.includes("?") ? `${base}&${qs}` : `${base}?${qs}`) : base;
};

/* ----------------- TABLE COMPONENTS (2 cols) ----------------- */

function DualProductTableBank({ rows = [], onProductClick, activeProduct }) {
  const fmt = (v) => (v === null || v === undefined || v === "" ? "-" : v);

  return (
    <div className="bank-row-two__table-wrap">
      <table className="bank-row-two__table">

        <colgroup>
          <col className="col-type" />
          <col className="col-amt" />
          <col className="col-type" />
          <col className="col-amt" />
        </colgroup>

        <thead>
          <tr>
            <th className="sticky-head">Grouping Code</th>
            <th>Amount</th>
            <th className="sticky-head">Grouping Code</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: 24 }}>
                No products to show
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
                {/* LEFT SIDE */}
                {row.left ? (
                  <>
                    <td>
                      <button
                        type="button"
                        className={`cell-pill cell-type cell-click ${
                          activeProduct === row.left.product ? "is-active" : ""
                        }`}
                        onClick={() =>
                          onProductClick && onProductClick(row.left.product)
                        }
                        title="Load type-wise details"
                      >
                        {row.left.product}
                      </button>
                    </td>
                    <td>
                      <div className="cell-pill cell-right">
                        {fmt(row.left.amount)}
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td />
                    <td />
                  </>
                )}

                {/* RIGHT SIDE */}
                {row.right ? (
                  <>
                    <td>
                      <button
                        type="button"
                        className={`cell-pill cell-type cell-click ${
                          activeProduct === row.right.product ? "is-active" : ""
                        }`}
                        onClick={() =>
                          onProductClick && onProductClick(row.right.product)
                        }
                        title="Load type-wise details"
                      >
                        {row.right.product}
                      </button>
                    </td>
                    <td>
                      <div className="cell-pill cell-right">
                        {fmt(row.right.amount)}
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td />
                    <td />
                  </>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StickyStatsTableBank({ rows = [], onTypeClick, activeType }) {
  const fmt = (v) => (v === null || v === undefined || v === "" ? "-" : v);

  return (
    <div className="bank-row-two__table-wrap">
      <table className="bank-row-two__table">

        <colgroup>
          <col className="col-type" />
          <col className="col-amt" />
        </colgroup>
        <thead>
          <tr>
            <th className="sticky-col sticky-head">Type</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className="sticky-col"
                colSpan={2}
                style={{ textAlign: "center", padding: "24px" }}
              >
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
                    className={`cell-pill cell-type cell-click ${
                      activeType === r.type ? "is-active" : ""
                    }`}
                    title="Show party-wise details"
                  >
                    {r.type}
                  </button>
                </td>
                <td>
                  <div className="cell-pill cell-right">{fmt(r.amount)}</div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StickyPartyTableBank({ rows = [], onPartyClick, activeParty }) {
  const fmt = (v) => (v === null || v === undefined || v === "" ? "-" : v);

  return (
    <div className="bank-row-two__table-wrap">
      <table className="bank-row-two__table">

        <colgroup>
          <col className="col-type" />
          <col className="col-amt" />
        </colgroup>
        <thead>
          <tr>
            <th className="sticky-col sticky-head">Party Wise</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className="sticky-col"
                colSpan={2}
                style={{ textAlign: "center", padding: "24px" }}
              >
                Click a Type on the left to view party-wise details
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
                    className={`cell-pill cell-type cell-click ${
                      activeParty === r.party ? "is-active" : ""
                    }`}
                    title="Show invoices"
                  >
                    {r.party}
                  </button>
                </td>
                <td>
                  <div className="cell-pill cell-right">{fmt(r.amount)}</div>
                </td>
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
      "bs code": "BS Code",          // ✅ add this
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
    <div className="bank-row-two__table-wrap">
      <table className="bank-row-two__table">

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


/* ================= MAIN PAGE ================= */

export default function BankStatement({ selectedView, timeQS = {} }) {
  const view = selectedView || null; // (not used yet, but kept for future)

  const [selectedPL, setSelectedPL] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedProductName, setSelectedProductName] = useState(null);

  useEffect(() => {
    setSelectedGroup(null);
    setSelectedProductName(null);
  }, [selectedPL]);

  useEffect(() => {
    setSelectedProductName(null);
  }, [selectedGroup]);

  const [dualProductRows, setDualProductRows] = useState([]);
  const [tableRows, setTableRows] = useState([]);
  const [partyRows, setPartyRows] = useState([]);
  const [invoiceCols, setInvoiceCols] = useState([]);
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const selectedPLRef = useRef(selectedPL);
  useEffect(() => {
    selectedPLRef.current = selectedPL;
  }, [selectedPL]);

  /* --------- 1) Product summary (top dual table) ---------- */
  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetch(withQS(`${BANK_API}/product-summary`, {}, timeQS))
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const rows = j.rows || [];
        setDualProductRows(rows);

        const currentSel = selectedPLRef.current;
        if (currentSel) {
          const allPls = rows.flatMap((p) =>
            [p.left && p.left.product, p.right && p.right.product].filter(Boolean)
          );
          if (!allPls.includes(currentSel)) {
            setSelectedPL(null);
          }
        }
      })
      .catch((e) => setErr(String(e)))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [timeQS]);

  /* --------- 2) Type-wise when PL selected ---------- */
  useEffect(() => {
    if (!selectedPL) {
      setTableRows([]);
      return;
    }
    let alive = true;
    setLoading(true);

    fetch(
      withQS(
        `${BANK_API}/types`,
        { plCode: selectedPL },
        timeQS
      )
    )
      .then((r) => r.json())
      .then((j) => {
        if (alive) setTableRows(j.rows || []);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [selectedPL, timeQS]);

  /* --------- 3) Party-wise when group selected ---------- */
  useEffect(() => {
    if (!selectedPL || !selectedGroup) {
      setPartyRows([]);
      return;
    }
    let alive = true;
    setLoading(true);

    fetch(
      withQS(
        `${BANK_API}/parties`,
        { plCode: selectedPL, groupCode: selectedGroup },
        timeQS
      )
    )
      .then((r) => r.json())
      .then((j) => {
        if (alive) setPartyRows(j.rows || []);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [selectedPL, selectedGroup, timeQS]);

  /* --------- 4) Invoice list when party selected ---------- */
  useEffect(() => {
    if (!selectedPL || !selectedGroup || !selectedProductName) {
      setInvoiceRows([]);
      setInvoiceCols([]);
      return;
    }
    let alive = true;
    setLoading(true);

    fetch(
      withQS(
        `${BANK_API}/invoices`,
        {
          plCode: selectedPL,
          groupCode: selectedGroup,
          productName: selectedProductName,
        },
        timeQS
      )
    )
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setInvoiceCols(j.columns || []);
        setInvoiceRows(j.rows || []);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [selectedPL, selectedGroup, selectedProductName, timeQS]);

  /* ================= RENDER ================= */

  return (
    <div className="page">
      {err && (
        <div className="card" style={{ padding: 12, color: "#f66" }}>
          Error: {err}
        </div>
      )}
      {loading && <div className="card" style={{ padding: 12 }}>Loading…</div>}

      {/* NO KPI PANEL ON THIS PAGE */}

      {/* TOP PRODUCT PANEL */}
      <section className="bank-product-panel panel--violet">
        <div className="bank-product-panel__header">
          <h3>
            Balance Sheet Details{" "}
            {selectedPL ? `—  ${selectedPL}` : ""}
          </h3>
        </div>
        <div className="bank-product-panel__body">
          <DualProductTableBank
            rows={dualProductRows}
            onProductClick={setSelectedPL}
            activeProduct={selectedPL}
          />
        </div>
      </section>

      {/* MIDDLE ROW: TYPE & PARTY */}
      <div className="bank-row-two">
        <div className="bank-row-two__grid">

          <section className="bank-row-two__panel panel--indigo">
            <div className="bank-row-two__header">
              <h3>
                Type Wise Details {selectedPL ? `— ${selectedPL}` : ""}
              </h3>
            </div>
            <div className="bank-row-two__body">

              <StickyStatsTableBank
                rows={tableRows}
                onTypeClick={setSelectedGroup}
                activeType={selectedGroup}
              />
            </div>
          </section>

          <section className="bank-row-two__panel panel--emerald">
            <div className="bank-row-two__header">
              <h3>
                Party Wise Details {selectedGroup ? `— ${selectedGroup}` : ""}
              </h3>
            </div>
            <div className="bank-row-two__body">
              <StickyPartyTableBank
                rows={partyRows}
                onPartyClick={setSelectedProductName}
                activeParty={selectedProductName}
              />
            </div>
          </section>
        </div>
      </div>

      {/* BOTTOM INVOICE PANEL */}
      <section className="bank-bottom-panel panel--rose">
        <div className="bank-bottom-panel__header">
          <h3>
            Invoice{" "}
            {selectedGroup ? `— ${selectedGroup}` : ""}{" "}
            {selectedProductName ? `— ${selectedProductName}` : ""}
          </h3>
        </div>
        <div className="bank-bottom-panel__body">
          <StickyInvoiceTable columns={invoiceCols} rows={invoiceRows} />
        </div>
      </section>
    </div>
  );
}
