// src/api/sheetApi.js
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export async function fetchMonthlyComparison(params = {}, options = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}/api/monthly-comparison${qs ? "?" + qs : ""}`;

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fetchMonthlyComparison failed: ${res.status} ${text}`);
  }
  return res.json();
}

