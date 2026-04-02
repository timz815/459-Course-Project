import { useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import { ReactComponent as EditIcon } from "../assets/Icon_16x16/Pen_16x16.svg";
import { ReactComponent as DeleteIcon } from "../assets/Icon_16x16/Delete_16x16.svg";
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

function AdminDashboard() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");
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
      const [usersRes, stocksRes] = await Promise.all([
        fetch("http://localhost:5000/api/users", { headers: authHeaders() }),
        fetch("http://localhost:5000/api/stocks", { headers: authHeaders() }),
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (stocksRes.ok) setStocks(await stocksRes.json());
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
      const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
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
      const res = await fetch("http://localhost:5000/api/stocks/admin", {
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
        `http://localhost:5000/api/stocks/admin/${symbol}`,
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
        `http://localhost:5000/api/stocks/admin/${symbol}`,
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

  const visibleStocks = stocksExpanded
    ? filteredStocks
    : filteredStocks.slice(0, VISIBLE_STOCK_COUNT);
  const hiddenCount = filteredStocks.length - VISIBLE_STOCK_COUNT;

  function getRoleLabel(role) {
    return role === "admin" ? "ADMIN" : "TRADER";
  }

  return (
    <div className="adm-page">
      <Header />

      {toast && (
        <div className={`adm-toast adm-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      <main className="adm-main">
        <div className="adm-grid">
          {/* ═══════════ LEFT: Manage Users ═══════════ */}
          <section className="adm-panel adm-panel--users">
            <div className="adm-panel-header">
              <div>
                <span className="adm-eyebrow">SYSTEM CONTROL</span>
                <h2 className="adm-panel-title">Manage Users</h2>
              </div>
            </div>

            <div className="adm-search-row">
              <div className="adm-search-wrap">
                <span className="adm-search-icon">&#x1F50D;</span>
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
                              disabled={u._id === user?.id}
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

          {/* ═══════════ RIGHT: Manage Stocks ═══════════ */}
          <section className="adm-panel adm-panel--stocks">
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
                <span className="adm-search-icon">&#x1F50D;</span>
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

            {/* Add stock form */}
            {showAddStock && (
              <form className="adm-add-form" onSubmit={handleAddStock}>
                <input
                  className="adm-add-input"
                  placeholder="Symbol"
                  value={newStock.symbol}
                  onChange={(e) =>
                    setNewStock((s) => ({ ...s, symbol: e.target.value }))
                  }
                  required
                />
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
                  <button type="submit" className="adm-btn adm-btn--primary">
                    Save
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost"
                    onClick={() => setShowAddStock(false)}
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
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
