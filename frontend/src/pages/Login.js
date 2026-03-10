/**
 * Login Component
 *
 * Authentication form for existing users to access their accounts.
 *
 * Key behaviours:
 * - Redirects authenticated users to dashboard immediately
 * - Validates credentials against backend API
 * - Displays server-side and client-side error messages
 * - Stores auth token via context on successful login
 * - Provides navigation link to registration page
 */

import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";

function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const { token, login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (token) navigate("/dashboard");
  }, [token, navigate]);

  // Update form state on input change
  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  // Submit credentials to API and handle response
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        login(data.token);
        navigate("/dashboard");
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Server error. Please try again later.");
    }
  }

  return (
    <div style={styles.page}>
      <Header />
      <main style={styles.main}>
        <article style={styles.card}>
          <h1 style={styles.title}>Login</h1>

          {error && <p role="alert" style={styles.error}>{error}</p>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <label htmlFor="username" style={styles.label}>Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Your username"
              onChange={handleChange}
              required
              style={styles.input}
            />
            
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Your password"
              onChange={handleChange}
              required
              style={styles.input}
            />
            
            <button type="submit" style={styles.submit}>Sign In</button>
          </form>

          <footer style={styles.footer}>
            <p style={styles.footerText}>
              Need an account?{" "}
              <Link to="/register" style={styles.link}>Register here</Link>
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
  error: {
    backgroundColor: "#4a1a1a",
    color: "#ff6b6b",
    padding: "0.625rem",
    borderRadius: "0.375rem",
    marginBottom: "1rem",
    fontSize: "0.9rem",
    textAlign: "center",
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
    marginTop: "1rem",
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
    fontWeight: "bold",
    textDecoration: "none",
  },
};

export default Login;