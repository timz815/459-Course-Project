/**
 * Header Component
 *
 * Main navigation header with logo, primary navigation, and authentication controls.
 *
 * Key behaviours:
 * - Sticky positioning at top of viewport
 * - Responsive navigation layout (logo left, nav center, auth right)
 * - Dropdown menu for authenticated users with account/logout options
 * - Click-outside detection to close dropdown
 * - Hover effects on navigation links
 * - Conditional rendering based on authentication state
 */

import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function Header() {
  const { token, user, logout } = useContext(AuthContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle logout and navigation
  function handleLogout() {
    logout();
    setDropdownOpen(false);
    navigate("/");
  }

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        {/* Logo */}
        <Link to="/" style={styles.logo}>
          PaperTrader Arena
        </Link>

        {/* Primary Navigation */}
        <nav style={styles.primaryNav} aria-label="Main navigation">
          <Link
            to="/tournaments"
            style={styles.navLink}
            onMouseEnter={e => e.target.style.backgroundColor = "#333333"}
            onMouseLeave={e => e.target.style.backgroundColor = "transparent"}
          >
            Tournaments
          </Link>
          <Link
            to="/stock-market"
            style={styles.navLink}
            onMouseEnter={e => e.target.style.backgroundColor = "#333333"}
            onMouseLeave={e => e.target.style.backgroundColor = "transparent"}
          >
            Stock Market
          </Link>
        </nav>

        {/* Authentication Navigation */}
        <nav style={styles.authNav} aria-label="User navigation">
          {token ? (
            <div style={styles.dropdown} ref={dropdownRef}>
              <button
                type="button"
                style={styles.accountButton}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
              >
                {user?.username}
                <span style={styles.caret} aria-hidden="true">{dropdownOpen ? "▲" : "▼"}</span>
              </button>

              {dropdownOpen && (
                <ul role="menu" style={styles.dropdownMenu}>
                  <li role="none">
                    <button
                      role="menuitem"
                      onClick={() => { navigate("/dashboard"); setDropdownOpen(false); }}
                      style={styles.menuItem}
                    >
                      Account
                    </button>
                  </li>
                  <li role="separator" style={styles.menuDivider} />
                  <li role="none">
                    <button
                      role="menuitem"
                      onClick={handleLogout}
                      style={styles.menuItemDanger}
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" style={styles.buttonOutline}>Login</Link>
              <Link to="/register" style={styles.buttonFilled}>Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

const BLUE = "#0F9FEA";
const BG = "#1A1A1A";
const TEXT = "#F9F9F9";

const styles = {
  header: {
    backgroundColor: BG,
    borderBottom: "1px solid #3a3a3a",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  container: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: "4rem",
    maxWidth: "93.75rem",
    margin: "0 auto",
    padding: "0 2.5rem",
  },
  logo: {
    fontSize: "1.2rem",
    fontWeight: "700",
    color: TEXT,
    textDecoration: "none",
    letterSpacing: "-0.01875rem",
    whiteSpace: "nowrap",
  },
  primaryNav: {
    display: "flex",
    gap: "2rem",
    alignItems: "center",
  },
  navLink: {
    color: TEXT,
    textDecoration: "none",
    fontSize: "0.95rem",
    fontWeight: "500",
    padding: "0.375rem 0.875rem",
    borderRadius: "0.375rem",
    backgroundColor: "transparent",
    transition: "background-color 0.2s",
  },
  authNav: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
  },
  buttonOutline: {
    padding: "0.5rem 1.25rem",
    borderRadius: "0.375rem",
    border: `2px solid ${BLUE}`,
    background: "transparent",
    color: BLUE,
    fontWeight: "600",
    fontSize: "0.9rem",
    textDecoration: "none",
  },
  buttonFilled: {
    padding: "0.5rem 1.25rem",
    borderRadius: "0.375rem",
    background: BLUE,
    color: "#fff",
    fontWeight: "600",
    fontSize: "0.9rem",
    textDecoration: "none",
  },
  dropdown: {
    position: "relative",
  },
  accountButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    borderRadius: "0.375rem",
    border: "none",
    background: "#333333",
    color: TEXT,
    fontWeight: "600",
    fontSize: "0.9rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  },
  caret: {
    fontSize: "0.6rem",
    color: "#aaa",
  },
  dropdownMenu: {
    position: "absolute",
    top: "calc(100% + 0.25rem)",
    right: 0,
    backgroundColor: "#333333",
    border: "none",
    borderRadius: "0.375rem",
    boxShadow: "0 0.25rem 1rem rgba(0,0,0,0.4)",
    width: "100%",
    minWidth: "unset",
    overflow: "hidden",
    boxSizing: "border-box",
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  menuItem: {
    width: "100%",
    padding: "0.5rem 1rem",
    background: "none",
    border: "none",
    textAlign: "center",
    cursor: "pointer",
    fontSize: "0.9rem",
    color: TEXT,
    fontWeight: "600",
    boxSizing: "border-box",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  },
  menuDivider: {
    height: "1px",
    backgroundColor: "#444",
    margin: "0 0.5rem",
    listStyle: "none",
  },
  menuItemDanger: {
    width: "100%",
    padding: "0.5rem 1rem",
    background: "none",
    border: "none",
    textAlign: "center",
    cursor: "pointer",
    fontSize: "0.9rem",
    color: "#ff6b6b",
    fontWeight: "600",
    boxSizing: "border-box",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  },
};

export default Header;