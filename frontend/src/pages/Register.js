/**
 * Register Component
 *
 * New user registration form with account creation and navigation to login.
 *
 * Key behaviours:
 * - Captures username and password via controlled inputs
 * - Submits credentials to backend registration endpoint
 * - Alerts user of success/failure and redirects to login on success
 * - Provides navigation link for existing users to access login page
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";

function Register() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const navigate = useNavigate();

  // Update form state on input change
  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  // Submit registration data to API and handle response
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Registration successful! Please log in.");
        navigate("/login");
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
    }
  }

  return (
    <div style={styles.page}>
      <Header />
      <main style={styles.main}>
        <article style={styles.card}>
          <h1 style={styles.title}>Create Account</h1>
          
          <form onSubmit={handleSubmit} style={styles.form}>
            <label htmlFor="username" style={styles.label}>Username</label>
            <input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Choose a username"
              style={styles.input}
            />
            
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Choose a password"
              style={styles.input}
            />
            
            <button type="submit" style={styles.submit}>
              Register
            </button>
          </form>
          
          <footer style={styles.footer}>
            <p style={styles.footerText}>
              Already have an account?{" "}
              <Link to="/login" style={styles.link}>
                Login here
              </Link>
            </p>
          </footer>
        </article>
      </main>
    </div>
  );
}

const BLUE = "#0F9FEA";
const TEXT = "#F9F9F9";

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#1A1A1A",
  },
  main: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 4rem)",
  },
  card: {
    width: "100%",
    maxWidth: "25rem",
    padding: "2rem",
    backgroundColor: "#333333",
    borderRadius: "0.5rem",
    boxShadow: "0 0.25rem 1.25rem rgba(0,0,0,0.4)",
  },
  title: {
    textAlign: "center",
    color: TEXT,
    marginBottom: "1.5rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  label: {
    fontSize: "0.8rem",
    fontWeight: "600",
    color: "#aaa",
    marginTop: "0.625rem",
  },
  input: {
    padding: "0.625rem 0.875rem",
    borderRadius: "0.375rem",
    border: "1px solid #444",
    backgroundColor: "#2a2a2a",
    color: TEXT,
    fontSize: "1rem",
    outline: "none",
  },
  submit: {
    marginTop: "1.2rem",
    backgroundColor: BLUE,
    color: "#fff",
    border: "none",
    padding: "0.625rem",
    borderRadius: "0.375rem",
    cursor: "pointer",
    width: "100%",
    fontWeight: "600",
    fontSize: "1rem",
  },
  footer: {
    marginTop: "1.5rem",
  },
  footerText: {
    textAlign: "center",
    fontSize: "0.9rem",
    color: "#888",
  },
  link: {
    color: BLUE,
    cursor: "pointer",
    fontWeight: "bold",
    textDecoration: "underline",
  },
};

export default Register;