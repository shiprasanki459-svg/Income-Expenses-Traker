import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./../styles/login.css";

// ✅ correct
const API = import.meta.env.VITE_API_BASE || "";


export default function Login({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const navigate = useNavigate();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

 const onSubmit = async (e) => {
  e.preventDefault();

  if (!form.email || !form.password) {
    alert("Please enter both email and password.");
    return;
  }

  try {
    const resp = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!resp.ok) {
      let errText;
      try {
        const errJson = await resp.json();
        errText = errJson.error || JSON.stringify(errJson);
      } catch {
        errText = await resp.text();
      }
      alert(errText || `Login failed (status ${resp.status})`);
      return;
    }

    const data = await resp.json();

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    if (typeof onLogin === "function") onLogin(data.user);
    navigate("/dashboard", { replace: true });
  } catch (err) {
    console.error("Network/server error:", err);
    alert("Server error. Please try again later.");
  }
};




  return (
    <div className="login-page">
      <div className="login-card">
        {/* ===== Left Blue Welcome Panel (unchanged) ===== */}
        <aside className="login-left">
          <div className="left-inner">
            <h2 className="welcome-title">WELCOME</h2>
            <p className="welcome-sub">Income & Expense Tracker</p>
            <p className="welcome-desc">
              Manage income, expenses, and reports <br></br>— all in one smart dashboard.            
            </p>

            {/* decorative circles */}
            <div className="circle circle-lg" />
            <div className="circle circle-md" />
            <div className="circle circle-sm" />
          </div>
        </aside>

       {/* ===== Right Minimal Sign-in Panel (underline style) ===== */}
        <main className="login-right">
            <div className="login-top-icon">
                {/* user outline icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none"
                stroke="#274c8a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M4 21v-2a4 4 0 0 1 3-3.87"></path>
                <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </div>

            <h3 className="signin-title">User Login</h3>

            <form className="signin-form" onSubmit={onSubmit} noValidate>
                {/* Email field */}
                <label className="field underline">
                <span className="icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="#6b6b85"
                    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <polyline points="22,6 12,13 2,6" />
                    </svg>
                </span>

                <input
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    placeholder="Email ID"
                    className="input underline-input"
                    required
                    type="email"
                    aria-label="Email ID"
                />
                </label>

                {/* Password field */}
                <label className="field underline" style={{ marginBottom: 6 }}>
                <span className="icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#6b6b85"
                    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                </span>

                <input
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    placeholder="Password"
                    className="input underline-input"
                    required
                    type={showPassword ? "text" : "password"}
                    aria-label="Password"
                />

                <button
                    type="button"
                    className="show-btn small"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-pressed={showPassword}
                >
                    {showPassword ? "Hide" : "Show"}
                </button>
                </label>

                <div className="row between small-row">
                <label className="remember">
                    <input type="checkbox" /> <span className="remember-text">Remember me</span>
                </label>
                <a className="forgot" href="#forgot">Forgot Password?</a>
                </div>

                <button className="btn primary wide" type="submit">LOGIN</button>
            </form>
        </main>

      </div>
    </div>
  );
}
