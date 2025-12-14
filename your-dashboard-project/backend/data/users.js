// backend/data/users.js
// Demo user list (in-memory). Replace with DB later.
// WARNING: passwords are plaintext here for demo convenience.

export const users = [
  {
    id: 1,
    email: "admin@example.com",
    password: "password123",
    name: "Admin User",
    role: "admin",
  },
  {
    id: 2,
    email: "user@example.com",
    password: "userpass",
    name: "Normal User",
    role: "user",
  },
];
