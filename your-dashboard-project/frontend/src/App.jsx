// src/App.jsx
import React, { useMemo, useState, useEffect } from "react";
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
    timeQS,
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
          timeQS={timeQS} 

        />

        {children}
      </div>
    </div>
  );
}

function getFinancialYearRange(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based

  const fyStartYear = month >= 3 ? year : year - 1;

  const start = `${fyStartYear}-04-01`;
  const end = date.toISOString().slice(0, 10);

  return {
    fyStartYear,
    start,
    end
  };
}


export default function App() {
  const [user, setUser] = useState(null);


  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  // topbar filters
  // 🔹 Financial Year default (1 April → Today)
  const { fyStartYear, start: fyStartDate, end: todayDate } =
    getFinancialYearRange();

  const [timeQS, setTimeQS] = useState({
    start: fyStartDate,
    end: todayDate
  });



  const monthNamesLong = [
    "", "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const [activeFilterType, setActiveFilterType] = useState("");
  const [activeFilterLabel, setActiveFilterLabel] = useState(
    `Showing: FY ${fyStartYear}-${fyStartYear + 1} (01 Apr → Today)`
  );
  const [disabledFilter, setDisabledFilter] = useState("");

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
  setDisabledFilter("");

  // Reset timeQS to Financial Year default
  setTimeQS({
    start: fyStartDate,
    end: todayDate
  });

  // Reset label
  setActiveFilterLabel(`Showing: FY ${fyStartYear}-${fyStartYear + 1} (01 Apr → Today)`);

  // 🔹 Clear ALL filter inputs visually
  const monthEl = document.getElementById("monthSelect");
  const yearEl  = document.getElementById("yearInput");
  const yearOnlyEl = document.getElementById("yearOnlyInput");
  const startEl = document.getElementById("startDate");
  const endEl   = document.getElementById("endDate");

  if (monthEl) monthEl.value = "";
  if (yearEl) yearEl.value = "";
  if (yearOnlyEl) yearOnlyEl.value = "";
  if (startEl) startEl.value = "";
  if (endEl) endEl.value = "";
};
  useEffect(() => {
    const checkFY = () => {
      const { fyStartYear, start, end } = getFinancialYearRange();

      setTimeQS((prev) => {
        // only auto-update if user is on DEFAULT (no active filter)
        if (
          !activeFilterType &&
          (prev.start !== start || prev.end !== end)
        ) {
          setActiveFilterLabel(
            `Showing: FY ${fyStartYear}-${fyStartYear + 1} (01 Apr → Today)`
          );
          return { start, end };
        }
        return prev;
      });
    };

    // run once on mount
    checkFY();

    // check once every day (safe & cheap)
    const interval = setInterval(checkFY, 60 * 60 * 1000); // every 1 hour

    return () => clearInterval(interval);
  }, [activeFilterType]);



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
                timeQS={timeQS} 
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
                timeQS={timeQS} 
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
                timeQS={timeQS} 
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
                timeQS={timeQS} 
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


 