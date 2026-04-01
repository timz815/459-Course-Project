/**
 * RegisterCompleted Component
 *
 * Shown after successful registration + auto-login.
 * Welcomes the user by name and presents onboarding steps.
 *
 * Key behaviours:
 * - Requires authentication — redirects to /register if no token
 * - Reads username from AuthContext to personalise the welcome heading
 * - Displays three onboarding step cards (Join, Analyze, Master)
 * - Provides links to Dashboard and Tournaments
 */

import { useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import CheckIcon from "../assets/Icon_Others/Check-Completed_64x64.svg";
import TrophyIcon from "../assets/Icon_16x16/Trophy_16x16.svg";
import MagnifyRiseIcon from "../assets/Icon_16x16/Magnify-Rise_16x16.svg";
import OutlierIcon from "../assets/Icon_16x16/Outlier-Diagram_16x16.svg";
import RightIcon from "../assets/Icon_16x16/Right_16x16.svg";
import "../styles/RegisterCompleted.css";

function RegisterCompleted() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  // Debug bypass for development/testing without full auth flow
  // uses URL param ?debug=1 or localStorage debugBypassRegisterCompleted=1 to allow access without token
  const debugMode =
    new URLSearchParams(window.location.search).get("debug") === "1" ||
    localStorage.getItem("debugBypassRegisterCompleted") === "1";

  useEffect(() => {
    if (!token && !debugMode) navigate("/register");
  }, [token, debugMode, navigate]);

  const username = user?.username || (debugMode ? "QuantAlpha" : "Trader");

  return (
    <div className="regcomplete-page">
      <Header />

      <main className="regcomplete-main">
        <div className="regcomplete-blur-blue" aria-hidden="true" />
        <div className="regcomplete-blur-green" aria-hidden="true" />

        <div className="regcomplete-container">
          {/* Status icon */}
          <img
            src={CheckIcon}
            alt=""
            className="regcomplete-icon"
            aria-hidden="true"
          />

          {/* Welcome heading */}
          <h1 className="regcomplete-heading">
            Welcome to the Arena,{" "}
            <span className="regcomplete-heading-username">{username}</span>!
          </h1>

          {/* Subtitle */}
          <p className="regcomplete-subtitle">
            Your account is now active and ready for institutional-grade paper
            trading. Follow these steps to begin your journey.
          </p>

          {/* Onboarding step cards */}
          <div className="regcomplete-grid">
            {/* Step 01 */}
            <div className="regcomplete-step">
              <p className="regcomplete-step-tag">Step 01</p>
              <h2 className="regcomplete-step-title">Join a Tournament</h2>
              <p className="regcomplete-step-desc">
                Browse open competitions and stake your initial balance to start
                competing against global participants.
              </p>
              <div className="regcomplete-step-footer">
                <img
                  src={TrophyIcon}
                  alt=""
                  className="regcomplete-step-footer-icon"
                />
                <span className="regcomplete-step-footer-label">
                  STATUS: READY TO ENTER
                </span>
              </div>
            </div>

            {/* Step 02 */}
            <div className="regcomplete-step">
              <p className="regcomplete-step-tag">Step 02</p>
              <h2 className="regcomplete-step-title">Analyze the Market</h2>
              <p className="regcomplete-step-desc">
                Research tickers with real-time institutional feeds and advanced
                technical indicators before making your move.
              </p>
              <div className="regcomplete-step-footer">
                <img
                  src={MagnifyRiseIcon}
                  alt=""
                  className="regcomplete-step-footer-icon"
                />
                <span className="regcomplete-step-footer-label">
                  TOOLS: UNLOCKED
                </span>
              </div>
            </div>

            {/* Step 03 */}
            <div className="regcomplete-step">
              <p className="regcomplete-step-tag">Step 03</p>
              <h2 className="regcomplete-step-title">Master the Leaderboard</h2>
              <p className="regcomplete-step-desc">
                Trade, climb the ranks, and sharpen your edge to prove you have
                what it takes to lead the Arena.
              </p>
              <div className="regcomplete-step-footer">
                <img
                  src={OutlierIcon}
                  alt=""
                  className="regcomplete-step-footer-icon"
                />
                <span className="regcomplete-step-footer-label">
                  CURRENT_TIER: ROOKIE
                </span>
              </div>
            </div>
          </div>

          {/* Primary actions */}
          <div className="regcomplete-actions">
            <Link to="/dashboard" className="regcomplete-submit">
              Go to My Dashboard
            </Link>
            <Link to="/tournaments" className="regcomplete-browse-link">
              Browse Open Tournaments
              <img
                src={RightIcon}
                alt=""
                className="regcomplete-browse-arrow"
              />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default RegisterCompleted;
