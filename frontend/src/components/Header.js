import { useContext, useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Button from "./UI/Button";
import "../styles/Header.css";

const TICKER_ITEMS = [
  { symbol: "AAPL", change: "+1.24%", positive: true },
  { symbol: "TSLA", change: "-0.82%", positive: false },
  { symbol: "BTC", change: "+4.11%", positive: true },
  { symbol: "NVDA", change: "+2.45%", positive: true },
  { symbol: "SPY", change: "+0.15%", positive: true },
  { symbol: "MSFT", change: "-0.22%", positive: false },
];

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

  function closeMenu() {
    setDropdownOpen(false);
  }

  return (
    <header className="app-header" data-node-id="28:3357">
      <div className="header-ticker" data-node-id="28:3303" aria-hidden="true">
        <div className="ticker-track">
          {[
            ...TICKER_ITEMS,
            ...TICKER_ITEMS,
            ...TICKER_ITEMS,
            ...TICKER_ITEMS,
          ].map((item, idx) => (
            <span key={`${item.symbol}-${idx}`} className="ticker-item">
              <span className="ticker-symbol">{item.symbol}</span>
              <span
                className={
                  item.positive
                    ? "ticker-change positive"
                    : "ticker-change negative"
                }
              >
                {item.change}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="header-main">
        <div className="header-inner">
          <Link to="/" className="header-logo" onClick={closeMenu}>
            PAPERTRADER ARENA
          </Link>

          <nav className="header-nav" aria-label="Main navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? "header-nav-link active" : "header-nav-link"
              }
              onClick={closeMenu}
            >
              Home
            </NavLink>
            <NavLink
              to="/tournaments"
              className={({ isActive }) =>
                isActive ? "header-nav-link active" : "header-nav-link"
              }
              onClick={closeMenu}
            >
              Tournaments
            </NavLink>
            <NavLink
              to="/stock-market"
              className={({ isActive }) =>
                isActive ? "header-nav-link active" : "header-nav-link"
              }
              onClick={closeMenu}
            >
              Stock Market
            </NavLink>
          </nav>

          <nav className="header-auth" aria-label="User navigation">
            {token ? (
              <div className="header-dropdown" ref={dropdownRef}>
                <button
                  type="button"
                  className="account-button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-haspopup="menu"
                  aria-expanded={dropdownOpen}
                >
                  <span className="account-dot" aria-hidden="true" />
                  <span>{user?.username || "Account"}</span>
                  <span className="account-caret" aria-hidden="true">
                    {dropdownOpen ? "▲" : "▼"}
                  </span>
                </button>

                {dropdownOpen && (
                  <ul role="menu" className="account-menu">
                    <li role="none">
                      <button
                        role="menuitem"
                        onClick={() => {
                          navigate("/dashboard");
                          setDropdownOpen(false);
                        }}
                        className="account-menu-item"
                      >
                        Dashboard
                      </button>
                    </li>
                    <li role="separator" className="account-menu-divider" />
                    <li role="none">
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        className="account-menu-item danger"
                      >
                        Logout
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            ) : (
              <>
                <Button as={Link} to="/login" variant="secondary">
                  Login
                </Button>
                <Button as={Link} to="/register" variant="primary">
                  Register
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
