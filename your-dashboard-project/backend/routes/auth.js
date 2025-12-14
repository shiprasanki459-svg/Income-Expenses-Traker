import express from "express";
import jwt from "jsonwebtoken";
import { users } from "../data/users.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "please_change_this_secret";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "6h";

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const user = users.find(
    (u) => u.email.toLowerCase() === String(email).toLowerCase()
  );

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

  return res.json({ token, user: payload });
});

// middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const token = auth.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// GET /api/auth/users
router.get("/users", requireAuth, (req, res) => {
  const safe = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
  }));
  res.json({ users: safe });
});

export default router;
