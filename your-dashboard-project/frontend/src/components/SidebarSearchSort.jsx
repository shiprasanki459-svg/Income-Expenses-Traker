// src/components/SidebarSearchSort.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/sidebar.css";

export default function SidebarSearchSort() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (to) => (pathname === to ? "active" : "");

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`} id="sidebar">
      {/* Logo */}
      <div className="logo">
        <img
          src="https://costusrice.com/wp-content/uploads/2022/10/logo-hemraj.png"
          alt="HIPL Logo"
          className="sidebar-logo"
        />
        <div className="logo-text">
          <span className="main">HIPL</span>
          <span>Income & Expenses</span>
          <span className="highlight">Tracker</span>
        </div>
      </div>

      {/* Main nav (ONLY TWO ITEMS) */}
      <ul>
        <li className={isActive("/dashboard") || pathname === "/" ? "active" : ""}>
          <Link to="/dashboard">
            <i className="fas fa-chart-line" />
            <span>PL</span>
          </Link>
        </li>

        <li className={isActive("/bank-statement")}>
          <Link to="/bank-statement">
            <i className="fas fa-university" />
            <span>BS</span>
          </Link>
        </li>
        
        <li className={isActive("/compare-month")}>
          <Link to="/compare-month">
            <i className="fas fa-balance-scale" />
            <span>Month Comparison</span>
          </Link>
        </li>


        {/* New submenu: Customized Comparison */}
        <li className={isActive("/custom-compare-month")}>
          <Link to="/custom-compare-month">
            <i className="fas fa-sliders-h" />
            <span>Customized Compare</span>
          </Link>
        </li>

      </ul>

      
    </aside>
  );
}
