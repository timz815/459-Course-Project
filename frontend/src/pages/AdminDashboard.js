import { useContext, useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import { ReactComponent as EditIcon } from "../assets/Icon_16x16/Pen_16x16.svg";
import { ReactComponent as DeleteIcon } from "../assets/Icon_16x16/Delete_16x16.svg";
import { ReactComponent as MagnifyIcon } from "../assets/Icon_16x16/Magnify_16x16.svg";
import { ReactComponent as ProfileIcon } from "../assets/Icon_Others/Profile-Default_32x32.svg";
import "../styles/AdminDashboard.css";

function ConfirmButton({ label, onConfirm, disabled }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="adm-confirm-row">
        <button
          className="adm-btn adm-btn--ghost"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
        <button
          className="adm-btn adm-btn--danger"
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
        >
          Confirm
        </button>
      </span>
    );
  }

  return (
    <button
      className="adm-btn adm-btn--danger"
      onClick={() => setConfirming(true)}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusLabel(status) {
  switch (status) {
    case "open": return "OPEN";
    case "active": return "ACTIVE";
    case "closed": return "CLOSED";
    case "ended": return "ENDED";
    default: return status?.toUpperCase() || "—";
  }
}

function AdminDashboard() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [tournamentSearch, setTournamentSearch] = useState("");
  const [stocksExpanded, setStocksExpanded] = useState(false);

  // Add-stock form
  const [showAddStock, setShowAddStock] = useState(false);
  const [newStock, setNewStock] = useState({
    symbol: "",
    name: "",
    sector: "",
    industry: "",
    exchange: "NASDAQ",
  });

  // Ticker search for add-stock form
  const [tickerQuery, setTickerQuery] = useState("");
  const [tickerResults, setTickerResults] = useState([]);
  const [tickerLoading, setTickerLoading] = useState(false);
  const [showTickerDropdown, setShowTickerDropdown] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const tickerDebounce = useRef(null);
  const tickerWrapRef = useRef(null);

  // Edit-stock state
  const [editingSymbol, setEditingSymbol] = useState(null);
  const [editForm, setEditForm] = useState({ name: "" });

  // Delete-stock confirmation
  const [confirmDeleteSymbol, setConfirmDeleteSymbol] = useState(null);

  const VISIBLE_STOCK_COUNT = 5;

  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // Close ticker dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (tickerWrapRef.current && !tickerWrapRef.current.contains(e.target)) {
        setShowTickerDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced ticker search
  function handleTickerSearch(value) {
    setTickerQuery(value);
    setNewStock((s) => ({ ...s, symbol: value }));
    clearTimeout(tickerDebounce.current);

    if (value.trim().length < 1) {
      setTickerResults([]);
      setShowTickerDropdown(false);
      return;
    }

    setTickerLoading(true);
    setShowTickerDropdown(true);

    tickerDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `http://localhost:5001/api/stocks/admin/search?q=${encodeURIComponent(value.trim())}`,
          { headers: authHeaders() },
        );
        if (res.ok) {
          const data = await res.json();
          setTickerResults(data);
        }
      } catch {
        setTickerResults([]);
      } finally {
        setTickerLoading(false);
      }
    }, 300);
  }

  // Select a ticker from dropdown → lookup full details
  async function handleTickerSelect(symbol) {
    setShowTickerDropdown(false);
    setTickerQuery(symbol);
    setLookupLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5001/api/stocks/admin/lookup/${encodeURIComponent(symbol)}`,
        { headers: authHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        setNewStock({
          symbol: data.symbol || symbol,
          name: data.name || "",
          sector: data.sector || "",
          industry: data.industry || "",
          exchange: data.exchange || "NASDAQ",
        });
        setTickerQuery(data.symbol || symbol);
      } else {
        setNewStock((s) => ({ ...s, symbol }));
        showToast("Could not load ticker details — fill manually", "error");
      }
    } catch {
      showToast("Lookup failed — fill fields manually", "error");
    } finally {
      setLookupLoading(false);
    }
  }

  function authHeaders() {
    return { "Content-Type": "application/json", Authorization: token };
  }

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [usersRes, stocksRes, tournamentsRes] = await Promise.all([
        fetch("http://localhost:5001/api/users", { headers: authHeaders() }),
        fetch("http://localhost:5001/api/stocks", { headers: authHeaders() }),
        fetch("http://localhost:5001/api/tournaments", { headers: authHeaders() }),
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (stocksRes.ok) setStocks(await stocksRes.json());
      if (tournamentsRes.ok) setTournaments(await tournamentsRes.json());
    } catch (err) {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── User actions ──

  async function handleDeleteUser(userId) {
    try {
      const res = await fetch(`http://localhost:5001/api/users/${userId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u._id !== userId));
        showToast(data.message);
      } else {
        showToast(data.message || "Delete failed", "error");
      }
    } catch {
      showToast("Server error", "error");
    }
  }

  // ── Stock actions ──

  async function handleAddStock(e) {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5001/api/stocks/admin", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(newStock),
      });
      const data = await res.json();
      if (res.ok) {
        setStocks((prev) =>
          [...prev, data.stock].sort((a, b) =>
            a.symbol.localeCompare(b.symbol),
          ),
        );
        setShowAddStock(false);
        setNewStock({
          symbol: "",
          name: "",
          sector: "",
          industry: "",
          exchange: "NASDAQ",
        });
        setTickerQuery("");
        setTickerResults([]);
        showToast(data.message);
      } else {
        showToast(data.message || "Add failed", "error");
      }
    } catch {
      showToast("Server error", "error");
    }
  }

  async function handleEditStock(symbol) {
    try {
      const res = await fetch(
        `http://localhost:5001/api/stocks/admin/${symbol}`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(editForm),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setStocks((prev) =>
          prev.map((s) => (s.symbol === symbol ? data.stock : s)),
        );
        setEditingSymbol(null);
        showToast(data.message);
      } else {
        showToast(data.message || "Update failed", "error");
      }
    } catch {
      showToast("Server error", "error");
    }
  }

  async function handleDeleteStock(symbol) {
    try {
      const res = await fetch(
        `http://localhost:5001/api/stocks/admin/${symbol}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setStocks((prev) => prev.filter((s) => s.symbol !== symbol));
        setConfirmDeleteSymbol(null);
        showToast(data.message);
      } else {
        showToast(data.message || "Delete failed", "error");
      }
    } catch {
      showToast("Server error", "error");
    }
  }

  // ── Tournament actions ──

  async function handleDeleteTournament(tournamentId) {
    try {
      const res = await fetch(
        `http://localhost:5001/api/tournaments/admin/${tournamentId}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setTournaments((prev) => prev.filter((t) => t._id !== tournamentId));
        showToast(data.message);
      } else {
        showToast(data.message || "Delete failed", "error");
      }
    } catch {
      showToast("Server error", "error");
    }
  }

  // ── Filters ──

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const filteredStocks = stocks.filter(
    (s) =>
      s.symbol?.toLowerCase().includes(stockSearch.toLowerCase()) ||
      s.name?.toLowerCase().includes(stockSearch.toLowerCase()),
  );

  const filteredTournaments = tournaments.filter(
    (t) =>
      t.name?.toLowerCase().includes(tournamentSearch.toLowerCase()) ||
      t.owner?.username?.toLowerCase().includes(tournamentSearch.toLowerCase()),
  );

  const visibleStocks = stocksExpanded
    ? filteredStocks
    : filteredStocks.slice(0, VISIBLE_STOCK_COUNT);
  const hiddenCount = filteredStocks.length - VISIBLE_STOCK_COUNT;

  function getRoleLabel(role) {
    return role === "admin" ? "ADMIN" : "TRADER";
  }

  const TABS = [
    { id: "users", label: "Users" },
    { id: "stocks", label: "Stocks" },
    { id: "tournaments", label: "Tournaments" },
  ];

  return (
    <div className="adm-page">
      <Header />

      {toast && (
        <div className={`adm-toast adm-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      <main className="adm-main">
        {/* ── Tab bar ── */}
        <div className="adm-tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`adm-tab${activeTab === tab.id ? " adm-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════ USERS TAB ══════════════ */}
        {activeTab === "users" && (
          <section className="adm-panel">
            <div className="adm-panel-header">
              <div>
                <span className="adm-eyebrow">SYSTEM CONTROL</span>
                <h2 className="adm-panel-title">Manage Users</h2>
              </div>
            </div>

            <div className="adm-search-row">
              <div className="adm-search-wrap">
                <MagnifyIcon className="adm-search-icon" />
                <input
                  className="adm-search"
                  type="text"
                  placeholder="Search accounts..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="adm-loading">Loading users…</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="adm-empty">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u._id}>
                          <td>
                            <div className="adm-user-cell">
                              {u.avatarUrl ? (
                                <img
                                  src={u.avatarUrl}
                                  alt=""
                                  className="adm-user-avatar"
                                />
                              ) : (
                                <ProfileIcon className="adm-user-avatar-fallback" />
                              )}
                              <span className="adm-user-name">
                                {u.username}
                              </span>
                            </div>
                          </td>
                          <td className="adm-cell-muted">{u.email || "—"}</td>
                          <td>
                            <span
                              className={`adm-role-badge adm-role-badge--${u.role || "user"}`}
                            >
                              {getRoleLabel(u.role)}
                            </span>
                          </td>
                          <td>
                            <span className="adm-status">
                              <span className="adm-status-dot adm-status-dot--active" />
                              ACTIVE
                            </span>
                          </td>
                          <td>
                            <ConfirmButton
                              label="DELETE"
                              disabled={u._id === user?.id || u.role === "admin"}
                              onConfirm={() => handleDeleteUser(u._id)}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ══════════════ STOCKS TAB ══════════════ */}
        {activeTab === "stocks" && (
          <section className="adm-panel">
            <div className="adm-panel-header">
              <div>
                <span className="adm-eyebrow adm-eyebrow--stocks">
                  MARKET ASSETS
                </span>
                <h2 className="adm-panel-title">Manage Stocks</h2>
              </div>
            </div>

            <div className="adm-search-row">
              <div className="adm-search-wrap">
                <MagnifyIcon className="adm-search-icon" />
                <input
                  className="adm-search"
                  type="text"
                  placeholder="Search Stocks..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                />
              </div>
              <button
                className="adm-add-stock-btn"
                onClick={() => setShowAddStock((v) => !v)}
              >
                <span className="adm-add-stock-plus">+</span> Add Stock
              </button>
            </div>

            {showAddStock && (
              <form className="adm-add-form" onSubmit={handleAddStock}>
                {/* Ticker search with autocomplete */}
                <div className="adm-ticker-wrap" ref={tickerWrapRef}>
                  <input
                    className="adm-add-input adm-ticker-input"
                    placeholder="Search ticker or company…"
                    value={tickerQuery}
                    onChange={(e) => handleTickerSearch(e.target.value)}
                    onFocus={() => tickerResults.length > 0 && setShowTickerDropdown(true)}
                    autoComplete="off"
                    required
                  />
                  {showTickerDropdown && (
                    <ul className="adm-ticker-dropdown">
                      {tickerLoading ? (
                        <li className="adm-ticker-item adm-ticker-item--loading">Searching…</li>
                      ) : tickerResults.length === 0 ? (
                        <li className="adm-ticker-item adm-ticker-item--empty">No results</li>
                      ) : (
                        tickerResults.map((t) => (
                          <li
                            key={t.symbol}
                            className="adm-ticker-item"
                            onMouseDown={() => handleTickerSelect(t.symbol)}
                          >
                            <span className="adm-ticker-item-symbol">{t.symbol}</span>
                            <span className="adm-ticker-item-name">{t.name}</span>
                            <span className="adm-ticker-item-exchange">{t.exchange}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>

                {lookupLoading && (
                  <span className="adm-lookup-loading">Loading details…</span>
                )}

                <input
                  className="adm-add-input"
                  placeholder="Company Name"
                  value={newStock.name}
                  onChange={(e) =>
                    setNewStock((s) => ({ ...s, name: e.target.value }))
                  }
                  required
                />
                <input
                  className="adm-add-input"
                  placeholder="Sector"
                  value={newStock.sector}
                  onChange={(e) =>
                    setNewStock((s) => ({ ...s, sector: e.target.value }))
                  }
                  required
                />
                <input
                  className="adm-add-input"
                  placeholder="Industry"
                  value={newStock.industry}
                  onChange={(e) =>
                    setNewStock((s) => ({ ...s, industry: e.target.value }))
                  }
                  required
                />
                <select
                  className="adm-add-input"
                  value={newStock.exchange}
                  onChange={(e) =>
                    setNewStock((s) => ({ ...s, exchange: e.target.value }))
                  }
                >
                  <option value="NASDAQ">NASDAQ</option>
                  <option value="NYSE">NYSE</option>
                </select>
                <div className="adm-add-actions">
                  <button type="submit" className="adm-btn adm-btn--primary" disabled={lookupLoading}>
                    Save
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost"
                    onClick={() => {
                      setShowAddStock(false);
                      setTickerQuery("");
                      setTickerResults([]);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="adm-loading">Loading stocks…</div>
            ) : (
              <div className="adm-stock-list">
                {visibleStocks.length === 0 ? (
                  <div className="adm-empty">No stocks found.</div>
                ) : (
                  visibleStocks.map((s) => (
                    <div key={s.symbol} className="adm-stock-card">
                      {editingSymbol === s.symbol ? (
                        <div className="adm-stock-edit-row">
                          <input
                            className="adm-add-input adm-stock-edit-input"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ name: e.target.value })
                            }
                            placeholder="Company Name"
                          />
                          <button
                            className="adm-btn adm-btn--primary"
                            onClick={() => handleEditStock(s.symbol)}
                          >
                            Save
                          </button>
                          <button
                            className="adm-btn adm-btn--ghost"
                            onClick={() => setEditingSymbol(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : confirmDeleteSymbol === s.symbol ? (
                        <div className="adm-stock-info">
                          <span className="adm-stock-symbol">{s.symbol}</span>
                          <span className="adm-stock-name">
                            Delete this stock?
                          </span>
                        </div>
                      ) : (
                        <div className="adm-stock-info">
                          <span className="adm-stock-symbol">{s.symbol}</span>
                          <span className="adm-stock-name">{s.name}</span>
                        </div>
                      )}

                      <div className="adm-stock-actions">
                        {confirmDeleteSymbol === s.symbol ? (
                          <>
                            <button
                              className="adm-btn adm-btn--danger"
                              onClick={() => handleDeleteStock(s.symbol)}
                            >
                              Confirm
                            </button>
                            <button
                              className="adm-btn adm-btn--ghost"
                              onClick={() => setConfirmDeleteSymbol(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : editingSymbol !== s.symbol ? (
                          <>
                            <button
                              className="adm-stock-icon-btn"
                              onClick={() => {
                                setEditingSymbol(s.symbol);
                                setEditForm({ name: s.name });
                              }}
                              aria-label={`Edit ${s.symbol}`}
                            >
                              <EditIcon />
                            </button>
                            <button
                              className="adm-stock-icon-btn adm-stock-icon-btn--delete"
                              onClick={() => setConfirmDeleteSymbol(s.symbol)}
                              aria-label={`Delete ${s.symbol}`}
                            >
                              <DeleteIcon />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}

                {!stocksExpanded && hiddenCount > 0 && (
                  <button
                    className="adm-stock-more"
                    onClick={() => setStocksExpanded(true)}
                  >
                    View {hiddenCount} More Assets
                  </button>
                )}

                {stocksExpanded &&
                  filteredStocks.length > VISIBLE_STOCK_COUNT && (
                    <button
                      className="adm-stock-more"
                      onClick={() => setStocksExpanded(false)}
                    >
                      Show Less
                    </button>
                  )}
              </div>
            )}
          </section>
        )}

        {/* ══════════════ TOURNAMENTS TAB ══════════════ */}
        {activeTab === "tournaments" && (
          <section className="adm-panel">
            <div className="adm-panel-header">
              <div>
                <span className="adm-eyebrow adm-eyebrow--tournaments">
                  COMPETITION
                </span>
                <h2 className="adm-panel-title">Manage Tournaments</h2>
              </div>
            </div>

            <div className="adm-search-row">
              <div className="adm-search-wrap">
                <MagnifyIcon className="adm-search-icon" />
                <input
                  className="adm-search"
                  type="text"
                  placeholder="Search tournaments..."
                  value={tournamentSearch}
                  onChange={(e) => setTournamentSearch(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="adm-loading">Loading tournaments…</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Host</th>
                      <th>Status</th>
                      <th>Participants</th>
                      <th>End Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTournaments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="adm-empty">
                          No tournaments found.
                        </td>
                      </tr>
                    ) : (
                      filteredTournaments.map((t) => (
                        <tr key={t._id}>
                          <td>
                            <span className="adm-tournament-name">{t.name}</span>
                          </td>
                          <td className="adm-cell-muted">
                            {t.owner?.username || "—"}
                          </td>
                          <td>
                            <span className={`adm-status-badge adm-status-badge--${t.status}`}>
                              {getStatusLabel(t.status)}
                            </span>
                          </td>
                          <td className="adm-cell-muted">
                            {t.participantCount ?? "—"}
                          </td>
                          <td className="adm-cell-muted">
                            {t.end_date ? formatDate(t.end_date) : "—"}
                          </td>
                          <td>
                            <div className="adm-tournament-actions">
                              <button
                                className="adm-btn adm-btn--ghost adm-btn--detail"
                                onClick={() => navigate(`/tournaments/${t._id}`)}
                              >
                                Detail
                              </button>
                              <ConfirmButton
                                label="DELETE"
                                onConfirm={() => handleDeleteTournament(t._id)}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
