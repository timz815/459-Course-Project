/**
 * ForgotPassword Component
 *
 * Access recovery screen for requesting a password reset link.
 *
 * Key behaviours:
 * - Collects user email with shared Input component
 * - Shows lightweight success/error feedback
 * - Provides navigation back to login
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import Snackbar from "../components/UI/Snackbar";
import { AUTH_SNACKBAR_MESSAGES } from "../constants/authSnackbarMessages";
import LockedRefreshIcon from "../assets/Icon_16x16/Locked-Refresh_16x16.svg";
import MailIcon from "../assets/Icon_16x16/Mail_16x16.svg";
import LeftIcon from "../assets/Icon_16x16/Left_16x16.svg";
import "../styles/ForgotPassword.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [snackbar, setSnackbar] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSnackbar(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setSnackbar({
        type: "error",
        message: AUTH_SNACKBAR_MESSAGES.passwordRecovery.error,
      });
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5001/api/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        },
      );

      // If endpoint is not implemented yet, keep recovery UX usable for frontend testing.
      if (response.ok || response.status === 404) {
        setSnackbar({
          type: "success",
          message: AUTH_SNACKBAR_MESSAGES.passwordRecovery.success,
        });
      } else {
        setSnackbar({
          type: "error",
          message: AUTH_SNACKBAR_MESSAGES.passwordRecovery.error,
        });
      }
    } catch (err) {
      setSnackbar({
        type: "error",
        message: AUTH_SNACKBAR_MESSAGES.passwordRecovery.error,
      });
    }
  }

  return (
    <div className="forgot-page">
      <Header minimal />

      <main className="forgot-main">
        <div className="forgot-content">
          <div className="forgot-card">
            <div className="forgot-card-glow" aria-hidden="true" />

            <div className="forgot-header">
              <img
                src={LockedRefreshIcon}
                alt=""
                className="forgot-hero-icon"
                aria-hidden="true"
              />
              <h1 className="forgot-title">Recover Access</h1>
              <p className="forgot-subtitle">
                Enter the email associated with your institutional account to
                receive reset instructions.
              </p>
            </div>

            <form className="forgot-form" onSubmit={handleSubmit}>
              <Input
                label="Email Address"
                id="email"
                name="email"
                type="email"
                placeholder="alpha.trader@terminal.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                icon={<img src={MailIcon} alt="" />}
              />

              <Button type="submit" variant="primary" className="forgot-submit">
                Send Reset Link
              </Button>
            </form>

            <div className="forgot-back-wrap">
              <Link to="/login" className="forgot-back-link">
                <img src={LeftIcon} alt="" className="forgot-back-icon" />
                Back to login
              </Link>
            </div>
          </div>

          {snackbar && (
            <Snackbar
              message={snackbar.message}
              type={snackbar.type}
              onDismiss={() => setSnackbar(null)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default ForgotPassword;
