import { useContext, useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Button from "./UI/Button";
import ProfileDropdown from "./UI/ProfileDropdown";
import "../styles/Header.css";

const FALLBACK_TICKER_ITEMS = [
  { symbol: "AAPL", change: "+1.24%", positive: true },
  { symbol: "TSLA", change: "-0.82%", positive: false },
  { symbol: "BTC", change: "+4.11%", positive: true },
  { symbol: "NVDA", change: "+2.45%", positive: true },
  { symbol: "SPY", change: "+0.15%", positive: true },
  { symbol: "MSFT", change: "-0.22%", positive: false },
];

const MAX_TICKER_ITEMS = 20;

function Header({ minimal = false }) {
  const { token, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tickerItems, setTickerItems] = useState(FALLBACK_TICKER_ITEMS);

  useEffect(() => {
    let isMounted = true;

    async function fetchTickerItems() {
      try {
        const res = await fetch("http://localhost:5000/api/stocks");
        if (!res.ok) {
          throw new Error(`Ticker fetch failed with status ${res.status}`);
        }

        const data = await res.json();
        if (!Array.isArray(data)) return;

        const liveItems = data
          .filter(
            (stock) =>
              typeof stock.symbol === "string" &&
              Number.isFinite(Number(stock.changePct)),
          )
          .sort((a, b) => a.symbol.localeCompare(b.symbol))
          .slice(0, MAX_TICKER_ITEMS)
          .map((stock) => {
            const pct = Number(stock.changePct);
            return {
              symbol: stock.symbol.toUpperCase(),
              change: `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`,
              positive: pct >= 0,
            };
          });

        if (isMounted && liveItems.length > 0) {
          setTickerItems(liveItems);
        }
      } catch (err) {
        console.error("Error fetching header ticker items:", err);
      }
    }

    fetchTickerItems();
    const intervalId = setInterval(fetchTickerItems, 60000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const isAdmin = user?.role === "admin";

  function handleLogout() {
    logout();
    navigate("/");
  }

  function closeMenu() {}

  return (
    <header className="app-header" data-node-id="28:3357">
      <div className="header-ticker" data-node-id="28:3303" aria-hidden="true">
        <div className="ticker-track">
          {[...tickerItems, ...tickerItems, ...tickerItems, ...tickerItems].map(
            (item, idx) => (
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
            ),
          )}
        </div>
      </div>

      <div className="header-main">
        <div className="header-inner">
          <Link to="/" className="header-logo" onClick={closeMenu}>
            PAPERTRADER ARENA
          </Link>

          {!minimal && (
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
          )}

          {!minimal && (
            <nav className="header-auth" aria-label="User navigation">
              {token ? (
                <>
                  {/* ── only renders for admins ── */}
                  {isAdmin && (
                    <button
                      className="header-admin-btn"
                      onClick={() => navigate("/admin")}
                    >
                      Admin
                    </button>
                  )}

                  <ProfileDropdown
                    userName={user?.username || "Account"}
                    isAdmin={isAdmin}
                    accountBalance={user?.accountBalance ?? 100000}
                    onAccountSettings={() => navigate("/account-settings")}
                    onDashboard={() => navigate("/dashboard")}
                    onAdminDashboard={() => navigate("/admin")}
                    onLogout={handleLogout}
                  />
                </>
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
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;