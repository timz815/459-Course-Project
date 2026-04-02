import { useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
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
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("users");
  const [search, setSearch] = useState("");

  // secondary role guard
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
      const [usersRes, tournamentsRes] = await Promise.all([
        fetch("http://localhost:5000/api/users", { headers: authHeaders() }),
        fetch("http://localhost:5000/api/tournaments", { headers: authHeaders() }),
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
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

  async function handleDeleteUser(userId, username) {
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

  async function handleDeleteTournament(tId) {
    try {
      const res = await fetch(`http://localhost:5000/api/tournaments/admin/${tId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setTournaments((prev) => prev.filter((t) => t._id !== tId));
        showToast(data.message);
      } else {
        showToast(data.message || "Delete failed", "error");
      }
    } catch {
      showToast("Server error", "error");
    }
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatCurrency(n) {
    if (n == null) return "—";
    return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 });
  }

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTournaments = tournaments.filter((t) =>
    t.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="adm-page">
      <Header />

      {toast && (
        <div className={`adm-toast adm-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      <main className="adm-main">
        {/* ── masthead ── */}
        <div className="adm-masthead">
          <div>
            <div className="adm-eyebrow">SYSTEM / CONTROL CENTER</div>
            <h1 className="adm-title">Admin Dashboard</h1>
            <p className="adm-subtitle">
              Platform-wide oversight — users and tournaments.
            </p>
          </div>
          <button className="adm-refresh-btn" onClick={fetchAll}>
            Refresh
          </button>
        </div>

        {/* ── tabs + search ── */}
        <div className="adm-controls">
          <div className="adm-tabs">
            <button
              className={`adm-tab ${activeTab === "users" ? "adm-tab--active" : ""}`}
              onClick={() => { setActiveTab("users"); setSearch(""); }}
            >
              Users
              <span className="adm-tab-badge">{users.length}</span>
            </button>
            <button
              className={`adm-tab ${activeTab === "tournaments" ? "adm-tab--active" : ""}`}
              onClick={() => { setActiveTab("tournaments"); setSearch(""); }}
            >
              Tournaments
              <span className="adm-tab-badge">{tournaments.length}</span>
            </button>
          </div>

          <input
            className="adm-search"
            type="text"
            placeholder={activeTab === "users" ? "Search users…" : "Search tournaments…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* ── users tab ── */}
        {activeTab === "users" && (
          <section className="adm-table-section">
            {loading ? (
              <div className="adm-loading">Loading users…</div>
            ) : filteredUsers.length === 0 ? (
              <div className="adm-empty">No users found.</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Display Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Balance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u._id} className={u._id === user?.id ? "adm-row--self" : ""}>
                        <td className="adm-cell-username">
                          {u.username}
                          {u._id === user?.id && (
                            <span className="adm-you-badge">YOU</span>
                          )}
                        </td>
                        <td className="adm-cell-muted">{u.displayName || "—"}</td>
                        <td className="adm-cell-muted">{u.email || "—"}</td>
                        <td>
                          <span className={`adm-role-badge adm-role-badge--${u.role || "user"}`}>
                            {u.role || "user"}
                          </span>
                        </td>
                        <td className="adm-cell-mono">{formatCurrency(u.accountBalance)}</td>
                        <td className="adm-cell-actions">
                          <ConfirmButton
                            label="Delete"
                            disabled={u._id === user?.id}
                            onConfirm={() => handleDeleteUser(u._id, u.username)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── tournaments tab ── */}
        {activeTab === "tournaments" && (
          <section className="adm-table-section">
            {loading ? (
              <div className="adm-loading">Loading tournaments…</div>
            ) : filteredTournaments.length === 0 ? (
              <div className="adm-empty">No tournaments found.</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th>Participants</th>
                      <th>Start → End</th>
                      <th>Starting Balance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTournaments.map((t) => (
                      <tr key={t._id}>
                        <td className="adm-cell-name">{t.name}</td>
                        <td className="adm-cell-muted">{t.owner?.username || "—"}</td>
                        <td>
                          <span className={`adm-status-badge adm-status-badge--${t.status}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="adm-cell-mono adm-cell-center">
                          {t.participantCount ?? 0}
                        </td>
                        <td className="adm-cell-muted adm-cell-dates">
                          {formatDate(t.start_date)}
                          <span className="adm-arrow"> → </span>
                          {formatDate(t.end_date)}
                        </td>
                        <td className="adm-cell-mono">{formatCurrency(t.starting_balance)}</td>
                        <td className="adm-cell-actions">
                          <button
                            className="adm-btn adm-btn--ghost"
                            onClick={() => navigate(`/tournaments/${t._id}`)}
                          >
                            View
                          </button>
                          <ConfirmButton
                            label="Delete"
                            onConfirm={() => handleDeleteTournament(t._id)}
                          />
                        </td>
                      </tr>
                    ))}
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