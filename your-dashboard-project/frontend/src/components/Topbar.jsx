import React, { useState } from "react";
import "../styles/topbar.css";

/**
 * Reusable Topbar component (extracted from your previous Dashboard.jsx)
 *
 * Props expected:
 * - onToggleSidebar: () => void
 * - activeFilterType: "" | "dateRange" | "month" | "year"
 * - disabledFilter: "" | "dateRange" | "month" | "year"
 * - activeFilterLabel: string
 * - applyDateRange: () => void
 * - applyMonthYear: () => void
 * - applyYearOnly: () => void
 * - clearFilter: () => void
 *
 * NOTE: Keep the same element IDs/classNames because your CSS depends on them.
 * IDs used: startDate, endDate, monthSelect, yearInput, yearOnlyInput, activeFilterLabel
 */


export default function Topbar({
  onToggleSidebar,
  activeFilterType = "",
  disabledFilter = "",
  activeFilterLabel = "",
  applyDateRange,
  applyMonthYear,
  applyYearOnly,
  clearFilter,
  showTopbarFilters = true,   // <-- new prop, default true
  openFiltersByDefault = false,

}) {
  const now = new Date();
// open the filters panel by default only when topbar filters are enabled
  const [filtersOpen, setFiltersOpen] = useState(!!openFiltersByDefault);


  return (
    <header className={`topbar ${filtersOpen ? "filters-open" : ""}`}>
      {/* Left: burger */}
      <div className="left">
        <i
          className="fas fa-bars"
          id="toggleBtn"
          onClick={onToggleSidebar}
          style={{ cursor: "pointer" }}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        />

        {/* only show the filter toggle if topbar filters are enabled */}
        {showTopbarFilters && (
          <button
            className="filter-toggle"
            onClick={() => setFiltersOpen(v => !v)}
            aria-expanded={filtersOpen}
            aria-controls="filters-panel"
            title="Filters"
          >
            <i className="fas fa-filter" />
          </button>
        )}
      </div>


      {/* Right: filters */}
      {/* Right: filters (only if allowed) */}
      {showTopbarFilters && (
        <div className="right">
          <div className="filter-box" id="filters-panel">
            <h4 className="filter-heading">
              Filter Time Range
              <span id="activeFilterLabel" className="filter-pill">
                {activeFilterLabel}
              </span>
            </h4>

            <div className="filter-blocks">
              {/* Date Range */}
              <div className="date-range-filter">
                <input
                  type="date"
                  id="startDate"
                  disabled={disabledFilter !== "" && disabledFilter !== "dateRange"}
                />
                <input
                  type="date"
                  id="endDate"
                  disabled={disabledFilter !== "" && disabledFilter !== "dateRange"}
                />
                <button onClick={applyDateRange}>Go</button>
                {activeFilterType === "dateRange" && (
                  <button
                    onClick={clearFilter}
                    style={{ marginLeft: "6px", cursor: "pointer" }}
                    aria-label="Clear date range"
                    title="Clear filter"
                  >
                    ✖
                  </button>
                )}
              </div>

              {/* Month / Year */}
               <div className="month-year-filter">
                <select
                  id="monthSelect"
                  defaultValue={now.getMonth() + 1}
                  disabled={disabledFilter !== "" && disabledFilter !== "month"}
                >
                  <option value="">Month</option>
                  <option value="1">Jan</option>
                  <option value="2">Feb</option>
                  <option value="3">Mar</option>
                  <option value="4">Apr</option>
                  <option value="5">May</option>
                  <option value="6">Jun</option>
                  <option value="7">Jul</option>
                  <option value="8">Aug</option>
                  <option value="9">Sep</option>
                  <option value="10">Oct</option>
                  <option value="11">Nov</option>
                  <option value="12">Dec</option>
                </select>

                <input
                  type="number"
                  id="yearInput"
                  defaultValue={now.getFullYear()}
                  min="2000"
                  max="2100"
                  step="1"
                  disabled={disabledFilter !== "" && disabledFilter !== "month"}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
                  }}
                  onInput={(e) => {
                    if (e.target.value.length > 4) e.target.value = e.target.value.slice(0, 4);
                  }}
                />

                <button onClick={applyMonthYear}>Go</button>
                {activeFilterType === "month" && (
                  <button
                    onClick={clearFilter}
                    style={{ marginLeft: "6px", cursor: "pointer" }}
                    aria-label="Clear month/year"
                    title="Clear filter"
                  >
                    ✖
                  </button>
                )}
              </div>

              {/* Year Only */}
              <div className="year-only-filter">
                <input
                  type="number"
                  id="yearOnlyInput"
                  placeholder="Year"
                  min="2000"
                  max="2100"
                  step="1"
                  disabled={disabledFilter !== "" && disabledFilter !== "year"}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
                  }}
                  onInput={(e) => {
                    if (e.target.value.length > 4) e.target.value = e.target.value.slice(0, 4);
                  }}
                />
                <button onClick={applyYearOnly}>Go</button>
                {activeFilterType === "year" && (
                  <button
                    onClick={clearFilter}
                    style={{ marginLeft: "6px", cursor: "pointer" }}
                    aria-label="Clear year"
                    title="Clear filter"
                  >
                    ✖
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}
