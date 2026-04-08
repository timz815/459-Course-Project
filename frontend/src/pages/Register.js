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

import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import Snackbar from "../components/UI/Snackbar";
import { AUTH_SNACKBAR_MESSAGES } from "../constants/authSnackbarMessages";
import ProfileIcon from "../assets/Icon_16x16/Profile_16x16.svg";
import MailIcon from "../assets/Icon_16x16/Mail_16x16.svg";
import LockIcon from "../assets/Icon_16x16/Lock_16x16.svg";
import CompletedIcon from "../assets/Icon_16x16/Completed_16x16.svg";
import "../styles/Register.css";

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSnackbar(null);

    // TODO(backend): Keep backend-side validation for password/confirmPassword equality.
    // Frontend checks improve UX, but backend must remain source of truth.
    if (formData.password !== formData.confirmPassword) {
      setSnackbar({ message: "Passwords do not match", type: "error" });
      return;
    }
    // TODO(backend): Persist terms acceptance (e.g., agreedToTerms + acceptedAt) if compliance is required.
    if (!agreed) {
      setSnackbar({ message: "You must agree to the terms", type: "error" });
      return;
    }

    try {
      // TODO(backend): Ensure /api/auth/register accepts { username, email, password }.
      // Current frontend already sends email; backend must validate, normalize, and store it.
      const res = await fetch("http://localhost:5001/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          // TODO(backend): Add unique email constraint and duplicate-email error messaging.
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Auto-login after successful registration
        const loginRes = await fetch("http://localhost:5001/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
          }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
          login(loginData.token);
          navigate("/register-completed");
        } else {
          // Fallback: registration succeeded but auto-login failed
          navigate("/login");
        }
      } else {
        // Map backend message to specific snackbar error
        const msg = data.message || "";
        if (
          msg.toLowerCase().includes("user already exists") ||
          msg.toLowerCase().includes("username")
        ) {
          setSnackbar({
            message: AUTH_SNACKBAR_MESSAGES.register.duplicateName,
            type: "error",
          });
        } else if (msg.toLowerCase().includes("email")) {
          setSnackbar({
            message: AUTH_SNACKBAR_MESSAGES.register.duplicateEmail,
            type: "error",
          });
        } else {
          setSnackbar({
            message: msg || AUTH_SNACKBAR_MESSAGES.register.generic,
            type: "error",
          });
        }
      }
    } catch (err) {
      setSnackbar({
        message: AUTH_SNACKBAR_MESSAGES.register.generic,
        type: "error",
      });
    }
  }

  return (
    <div className="register-page">
      <Header minimal />
      <main className="register-main">
        <div className="register-blur-blue" aria-hidden="true" />
        <div className="register-blur-green" aria-hidden="true" />

        <div className="register-card-stack">
          <article className="register-card">
            {/* Header */}
            <div className="register-header">
              <h1 className="register-title">Create Account</h1>
              <p className="register-subtitle">Join the Institutional Arena</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="register-form">
              {/* Username */}
              <Input
                label="Username"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="alpha.trader"
                icon={<img src={ProfileIcon} alt="" />}
              />

              {/* Email */}
              <Input
                label="Email Address"
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="alpha.trader@terminal.io"
                icon={<img src={MailIcon} alt="" />}
              />

              {/* Password */}
              <Input
                label="Secure Password"
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••••••"
                icon={<img src={LockIcon} alt="" />}
              />

              {/* Confirm Password */}
              <Input
                label="Confirm Password"
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••••••"
                icon={<img src={LockIcon} alt="" />}
              />

              {/* Terms */}
              <div className="register-terms">
                <button
                  type="button"
                  className={`register-checkbox ${agreed ? "register-checkbox-checked" : ""}`}
                  onClick={() => setAgreed(!agreed)}
                  aria-label="Agree to terms"
                >
                  {agreed && (
                    <img
                      src={CompletedIcon}
                      alt="Completed"
                      className="register-checkbox-icon"
                    />
                  )}
                </button>
                <label htmlFor="terms" className="register-terms-text">
                  I agree to the{" "}
                  <span className="register-terms-link">Terms of Service</span>{" "}
                  and acknowledge the{" "}
                  <span className="register-terms-link">
                    Trading Integrity Policy
                  </span>
                  .
                </label>
              </div>

              <Button type="submit" variant="primary" style={{ width: "100%" }}>
                Register
              </Button>
            </form>

            {/* Footer */}
            <div className="register-footer">
              <p className="register-footer-hint">Already a member?</p>
              <Link to="/login" className="register-footer-link">
                Login to Terminal
              </Link>
            </div>
          </article>

          <Snackbar
            message={snackbar?.message}
            type={snackbar?.type}
            onDismiss={() => setSnackbar(null)}
          />
        </div>
      </main>
    </div>
  );
}

export default Register;
