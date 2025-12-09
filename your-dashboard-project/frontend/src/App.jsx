// src/App.jsx
import React, { useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import SidebarSearchSort from "./components/SidebarSearchSort";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import BankStatement from "./pages/BankStatement";
import Login from "./pages/Login";
import MonthlyComparison from "./pages/CompareMonth";
import CustomComparison from "./pages/CustomComparison";


// Global styles
import "./styles/main_global.css";

function AppLayout({ children, ...props }) {
  // read sidebar state coming from parent via props
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    sidebarOpen,
    setSidebarOpen,
    sidebarHidden,
    handleToggleSidebar,
    // pass-through filter props (already passed in by you)
    activeFilterType,
    disabledFilter,
    activeFilterLabel,
    applyDateRange,
    applyMonthYear,
    applyYearOnly,
    clearFilter,
  } = props;

  // compute wrapper classes exactly like your previous working App.jsx
  const appWrapperClass = React.useMemo(() => {
    const classes = ["app-wrapper"];
    if (sidebarOpen) classes.push("sidebar-open");
    if (sidebarCollapsed) classes.push("sidebar-collapsed");
    if (sidebarHidden) classes.push("sidebar-hidden");
    return classes.join(" ");
  }, [sidebarOpen, sidebarCollapsed, sidebarHidden]);


  const showTopbarFilters = props.showTopbarFilters ?? true;
  return (
    <div className={appWrapperClass}>
      <SidebarSearchSort
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        onOpenMobile={() => setSidebarOpen(true)}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <div className="main-content">
        <Topbar
          onToggleSidebar={handleToggleSidebar}
          activeFilterType={activeFilterType}
          disabledFilter={disabledFilter}
          activeFilterLabel={activeFilterLabel}
          applyDateRange={applyDateRange}
          applyMonthYear={applyMonthYear}
          applyYearOnly={applyYearOnly}
          clearFilter={clearFilter}
          showTopbarFilters={showTopbarFilters}   /* <-- forward the flag */
            openFiltersByDefault={showTopbarFilters}   // <<--- add this line


        />

        {children}
      </div>
    </div>
  );
}


export default function App() {
  const [user, setUser] = useState(null);


  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  // topbar filters
  const now = new Date();
  const defaultMonth = now.getMonth() + 1;
  const defaultYear = now.getFullYear();
  const monthNamesLong = [
    "", "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const [activeFilterType, setActiveFilterType] = useState("");
  const [activeFilterLabel, setActiveFilterLabel] = useState(
    `Showing: ${monthNamesLong[defaultMonth]} ${defaultYear} (default)`
  );
  const [disabledFilter, setDisabledFilter] = useState("");
  const [timeQS, setTimeQS] = useState({ month: defaultMonth, year: defaultYear });

  const handleToggleSidebar = () => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) setSidebarOpen(v => !v);
    else setSidebarHidden(v => !v);
  };

  const applyDateRange = () => {
    const start = document.getElementById("startDate")?.value || "";
    const end = document.getElementById("endDate")?.value || "";
    if (!start || !end) return;

    const sDate = new Date(start);
    const eDate = new Date(end);
    const sLabel = `${sDate.getDate()} ${sDate.toLocaleString("default", { month: "short" })} ${sDate.getFullYear()}`;
    const eLabel = `${eDate.getDate()} ${eDate.toLocaleString("default", { month: "short" })} ${eDate.getFullYear()}`;

    setActiveFilterType("dateRange");
    setActiveFilterLabel(`Showing: ${sLabel} → ${eLabel}`);
    setDisabledFilter("dateRange");

    setTimeQS({ start, end, month: undefined, year: undefined });
  };

  const applyMonthYear = () => {
    const m = document.getElementById("monthSelect")?.value || "";
    const y = document.getElementById("yearInput")?.value || "";
    if (!m || !y) return;
    setActiveFilterType("month");
    setActiveFilterLabel(`Showing: ${monthNamesLong[Number(m)]} ${y}`);
    setDisabledFilter("month");
    setTimeQS({ month: Number(m), year: Number(y), start: undefined, end: undefined });
  };

  const applyYearOnly = () => {
    const y = document.getElementById("yearOnlyInput")?.value || "";
    if (!y) return;
    setActiveFilterType("year");
    setActiveFilterLabel(`Showing: Year ${y}`);
    setTimeQS({ year: Number(y), month: undefined, start: undefined, end: undefined });
  };

 const clearFilter = () => {
  setActiveFilterType("");
  setActiveFilterLabel(`Showing: ${monthNamesLong[defaultMonth]} ${defaultYear} (default)`);
  setDisabledFilter("");

  // Reset inputs visually to current month/year (keep year-only blank)
  const monthEl = document.getElementById("monthSelect");
  const yearEl  = document.getElementById("yearInput");
  const yearOnlyEl = document.getElementById("yearOnlyInput");
  const startEl = document.getElementById("startDate");
  const endEl   = document.getElementById("endDate");

  if (monthEl) monthEl.value = String(defaultMonth);
  if (yearEl)  yearEl.value  = String(defaultYear);
  if (yearOnlyEl) yearOnlyEl.value = "";
  if (startEl) startEl.value = "";
  if (endEl)   endEl.value   = "";

  // go back to default month scope
  setTimeQS({ month: defaultMonth, year: defaultYear });
};


  return (
    <BrowserRouter>
      <Routes>
        {/* Default route → Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* LOGIN (no sidebar or topbar) */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login
                onLogin={(u) => {
                  setUser(u || { email: "unknown" });
                  try { localStorage.setItem("user", JSON.stringify(u)); } catch (e) {}
                }}
              />
            )
          }
        />

        {/* PROTECTED ROUTES (with layout) */}
        <Route
          path="/dashboard"
          element={
            user ? (
              <AppLayout
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                sidebarHidden={sidebarHidden}
                handleToggleSidebar={handleToggleSidebar}
                activeFilterType={activeFilterType}
                disabledFilter={disabledFilter}
                activeFilterLabel={activeFilterLabel}
                applyDateRange={applyDateRange}
                applyMonthYear={applyMonthYear}
                applyYearOnly={applyYearOnly}
                clearFilter={clearFilter}
              >
                <Dashboard timeQS={timeQS} />
              </AppLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/bank-statement"
          element={
            user ? (
              <AppLayout
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                sidebarHidden={sidebarHidden}
                handleToggleSidebar={handleToggleSidebar}
                activeFilterType={activeFilterType}
                disabledFilter={disabledFilter}
                activeFilterLabel={activeFilterLabel}
                applyDateRange={applyDateRange}
                applyMonthYear={applyMonthYear}
                applyYearOnly={applyYearOnly}
                clearFilter={clearFilter}
              >
                {/* 🔹 Main fix: pass timeQS into BankStatement */}
                <BankStatement timeQS={timeQS} />
              </AppLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />


        <Route
          path="/compare-month"
          element={
            user ? (
              <AppLayout
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                sidebarHidden={sidebarHidden}
                handleToggleSidebar={handleToggleSidebar}
                activeFilterType={activeFilterType}
                disabledFilter={disabledFilter}
                activeFilterLabel={activeFilterLabel}
                applyDateRange={applyDateRange}
                applyMonthYear={applyMonthYear}
                applyYearOnly={applyYearOnly}
                clearFilter={clearFilter}
              >
                <MonthlyComparison timeQS={timeQS} />
              </AppLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/custom-compare-month"
          element={
            user ? (
              <AppLayout
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                sidebarHidden={sidebarHidden}
                handleToggleSidebar={handleToggleSidebar}
                activeFilterType={activeFilterType}
                disabledFilter={disabledFilter}
                activeFilterLabel={activeFilterLabel}
                applyDateRange={applyDateRange}
                applyMonthYear={applyMonthYear}
                applyYearOnly={applyYearOnly}
                clearFilter={clearFilter}
                showTopbarFilters={false}   /* <-- add this */

              >
                <CustomComparison timeQS={timeQS} />
              </AppLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

      </Routes>
    </BrowserRouter>
  );
}


 