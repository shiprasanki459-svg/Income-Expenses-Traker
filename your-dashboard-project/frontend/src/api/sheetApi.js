// src/api/sheetApi.js
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export async function fetchMonthlyComparison(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}/api/monthly-comparison${qs ? "?" + qs : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fetchMonthlyComparison failed: ${res.status} ${text}`);
  }
  return res.json();
}
