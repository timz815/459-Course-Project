/**
 * Login Component
 *
 * Authentication form for existing users to access their accounts.
 * Matches Figma design with ticker tape, full header, status indicators, and footer.
 *
 * Key behaviours:
 * - Displays scrolling ticker tape at top
 * - Redirects authenticated users to dashboard immediately
 * - Validates credentials against backend API
 * - Displays server-side and client-side error messages
 * - Stores auth token via context on successful login
 * - Shows network status and encryption indicators
 * - Provides navigation to registration page
 */

import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import Snackbar from "../components/UI/Snackbar";
import { AUTH_SNACKBAR_MESSAGES } from "../constants/authSnackbarMessages";
import ProfileIcon from "../assets/Icon_16x16/Profile_16x16.svg";
import LockIcon from "../assets/Icon_16x16/Lock_16x16.svg";
import "../styles/Login.css";

function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [snackbar, setSnackbar] = useState(null);
  const [isDelayingRedirect, setIsDelayingRedirect] = useState(false);
  const redirectTimerRef = useRef(null);
  const { token, login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (token && !isDelayingRedirect) navigate("/dashboard");
  }, [token, isDelayingRedirect, navigate]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  // Update form state on input change
  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  // Submit credentials to API and handle response
  async function handleSubmit(e) {
    e.preventDefault();
    setSnackbar(null);
    setIsDelayingRedirect(false);
    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        login(data.token);
        setSnackbar({
          type: "success",
          message: AUTH_SNACKBAR_MESSAGES.login.success,
        });
        setIsDelayingRedirect(true);
        if (redirectTimerRef.current) {
          clearTimeout(redirectTimerRef.current);
        }
        redirectTimerRef.current = setTimeout(() => {
          navigate("/dashboard");
        }, 3000);
      } else {
        setSnackbar({
          type: "error",
          message: AUTH_SNACKBAR_MESSAGES.login.error,
        });
      }
    } catch (err) {
      setSnackbar({
        type: "error",
        message: AUTH_SNACKBAR_MESSAGES.login.error,
      });
    }
  }

  return (
    <div className="login-page">
      <Header />

      <main className="login-main">
        <div className="login-content-wrapper">
          {/* Main login card section */}
          <div className="login-form-section">
            <div className="login-header">
              <div className="login-header-text">
                <h1 className="login-title">Authentication</h1>
                <p className="login-subtitle">Access Terminal</p>
              </div>
            </div>

            <div className="login-card-stack">
              <article className="login-card">
                <form onSubmit={handleSubmit} className="login-form">
                  {/* Username field */}
                  <Input
                    label="Username"
                    id="username"
                    name="username"
                    type="text"
                    placeholder="TRADER_01"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    icon={<img src={ProfileIcon} alt="" />}
                  />

                  {/* Password field */}
                  <Input
                    label="Password"
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    icon={<img src={LockIcon} alt="" />}
                    helper={
                      <Link to="/forgot-password" className="login-forgot-link">
                        Forgot your Password?
                      </Link>
                    }
                  />

                  {/* Login button */}
                  <Button
                    type="submit"
                    variant="primary"
                    className="login-submit"
                  >
                    Login
                  </Button>

                  {/* Register link */}
                  <div className="login-register-link">
                    <span className="login-register-text">New operative?</span>
                    <Link to="/register" className="login-register-btn">
                      Register terminal
                    </Link>
                  </div>
                </form>
              </article>

              {snackbar && (
                <Snackbar
                  message={snackbar.message}
                  type={snackbar.type}
                  onDismiss={() => setSnackbar(null)}
                />
              )}
            </div>

            {/* Status indicators */}
            <div className="login-status-bar">
              <div className="login-status-item">
                <div className="login-status-dot"></div>
                <p className="login-status-text">Network: Operational</p>
              </div>
              <div className="login-status-divider"></div>
              <div className="login-status-item">
                <p className="login-status-text">BCRYPT Encrypted</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;
