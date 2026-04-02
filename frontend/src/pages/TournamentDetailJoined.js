/**
 * TournamentDetailJoined Component
 *
 * Full tournament view for participants. Includes performance bento,
 * leaderboard, trading console sidebar, holdings, and community discussion.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Button from "../components/UI/Button";
import StockSearchDropdown from "../components/StockSearchDropdown";
import { ReactComponent as CheckIcon } from "../assets/Icon_16x16/Check-Completed_16x16.svg";
import { ReactComponent as SortIcon } from "../assets/Icon_16x16/Sort_16x16.svg";
import { ReactComponent as RefreshIcon } from "../assets/Icon_16x16/Refresh_16x16.svg";
import { ReactComponent as BothwayIcon } from "../assets/Icon_16x16/Bothway_16x16.svg";
import { ReactComponent as WalletIcon } from "../assets/Icon_16x16/Wallet_16x16.svg";
import { ReactComponent as CancelIcon } from "../assets/Icon_16x16/Cancel_16x16.svg";
import { ReactComponent as ShareIcon } from "../assets/Icon_16x16/Share_16x16.svg";
import { ReactComponent as ArrowRiseIcon } from "../assets/Icon_16x16/Arrow-Rise_16x16.svg";
import { ReactComponent as ProfileIcon } from "../assets/Icon_Others/Profile-Default_32x32.svg";
import "../styles/TournamentDetail.css";

function formatCurrency(amount) {
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
    case "open":
      return "OPEN";
    case "active":
      return "ACTIVE NOW";
    case "closed":
      return "CLOSED";
    case "ended":
      return "ENDED";
    default:
      return status?.toUpperCase() || "";
  }
}

function TournamentDetailJoined({
  tournament,
  participants,
  stocks,
  myParticipant,
  user,
  token,
  id,
  isOwner,
  handleLeave,
  handleClose,
  handleDeleteTournament,
  refreshParticipants,
}) {
  const navigate = useNavigate();
  const [selectedStock, setSelectedStock] = useState(null);
  const [tradeAmount, setTradeAmount] = useState("");
  const [commentText, setCommentText] = useState("");

  const cashBalance = myParticipant?.cash_balance ?? 0;
  const holdings = myParticipant?.holdings || [];
  const startingBalance = tournament.starting_balance || 100000;

  const holdingsValue = holdings.reduce(
    (sum, h) => sum + (h.amount_invested || 0),
    0,
  );
  const portfolioValue = cashBalance + holdingsValue;
  const totalGain = portfolioValue - startingBalance;
  const totalGainPct =
    startingBalance > 0
      ? ((totalGain / startingBalance) * 100).toFixed(2)
      : "0.00";

  const myRank =
    participants.findIndex(
      (p) => p.user?._id === user?.id || p.user === user?.id,
    ) + 1;

  function setAmountPercent(pct) {
    setTradeAmount(((cashBalance * pct) / 100).toFixed(2));
  }

  function handleExecuteBuy() {
    if (selectedStock && tradeAmount > 0) {
      navigate(`/tournaments/${id}/buy/${selectedStock.symbol}`, {
        state: { amount: tradeAmount },
      });
    }
  }

  return (
    <div className="td-page">
      <Header />

      <main className="td-main">
        {/* ── Header Section ── */}
        <section className="td-header-section">
          <div className="td-header-left">
            <div className="td-chips-row">
              <span
                className={`td-status-chip td-status-chip--${tournament.status}`}
              >
                {getStatusLabel(tournament.status)}
              </span>
              <span className="td-tournament-id">
                Tournament ID: PT-{id?.slice(-4) || id}
              </span>
            </div>

            <h1 className="td-title">{tournament.name}</h1>

            <div className="td-meta-row">
              <div className="td-meta-col">
                <span className="td-meta-label">Entry Balance</span>
                <span className="td-meta-value">
                  ${formatCurrency(tournament.starting_balance)}
                </span>
              </div>
              <div className="td-meta-col">
                <span className="td-meta-label">Participants</span>
                <span className="td-meta-value">
                  {participants.length.toLocaleString()}
                </span>
              </div>
              <div className="td-meta-col">
                <span className="td-meta-label">Closing Date</span>
                <span className="td-meta-value">
                  {formatDate(tournament.end_date)}
                </span>
              </div>
              {tournament.owner?.username && (
                <div className="td-meta-col">
                  <span className="td-meta-label">Host</span>
                  <span className="td-meta-value td-meta-value--host">
                    {tournament.owner.username}
                    <CheckIcon className="td-verified-icon" />
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="td-header-right">
            <button type="button" className="td-view-rules-btn">
              View Rules
            </button>
          </div>
        </section>

        {/* ── Joined Content Grid ── */}
        <div className="td-content-grid">
          {/* Left Column */}
          <div className="td-left-col">
            {/* Performance Overview Bento */}
            <div className="td-bento">
              <div className="td-bento-card td-bento-card--ranking">
                <span className="td-bento-label">Current Ranking</span>
                <span className="td-bento-big-value">
                  #{myRank || "--"}
                </span>
                {myRank > 0 &&
                  myRank <=
                    Math.ceil(participants.length * 0.05) && (
                    <span className="td-bento-sub td-bento-sub--green">
                      <ArrowRiseIcon className="td-bento-sub-icon" />
                      Top 5%
                    </span>
                  )}
              </div>
              <div className="td-bento-card">
                <span className="td-bento-label">Portfolio Value</span>
                <span className="td-bento-big-value td-bento-big-value--primary">
                  ${formatCurrency(portfolioValue)}
                </span>
                <span
                  className={`td-bento-sub ${totalGain >= 0 ? "td-bento-sub--green" : "td-bento-sub--red"}`}
                >
                  {totalGain >= 0 ? "+" : ""}$
                  {formatCurrency(Math.abs(totalGain))} ({totalGainPct}%)
                </span>
              </div>
              <div className="td-bento-card">
                <span className="td-bento-label">Total Trades</span>
                <span className="td-bento-big-value">
                  {holdings.length}
                </span>
                <span className="td-bento-sub td-bento-sub--muted">
                  Win Rate: --
                </span>
              </div>
            </div>

            {/* Leaderboard */}
            <section className="td-leaderboard">
              <div className="td-leaderboard-header">
                <h2 className="td-leaderboard-title">
                  Tournament Leaderboard
                </h2>
                <div className="td-leaderboard-actions">
                  <button
                    type="button"
                    className="td-icon-btn"
                    aria-label="Sort"
                  >
                    <SortIcon />
                  </button>
                  <button
                    type="button"
                    className="td-icon-btn"
                    onClick={refreshParticipants}
                    aria-label="Refresh"
                  >
                    <RefreshIcon />
                  </button>
                </div>
              </div>

              <div className="td-table">
                <div className="td-table-head">
                  <span className="td-th td-th--rank">Rank</span>
                  <span className="td-th td-th--user">User</span>
                  <span className="td-th td-th--value">Portfolio Value</span>
                  <span className="td-th td-th--change">Day Change</span>
                </div>
                <div className="td-table-body">
                  {participants.map((p, i) => {
                    const isMe =
                      user &&
                      (p.user?._id === user.id || p.user === user.id);
                    const rank = i + 1;
                    return (
                      <div
                        key={p._id}
                        className={`td-table-row${isMe ? " td-table-row--me" : ""}`}
                      >
                        <span className="td-td td-td--rank">
                          <span
                            className={`td-rank-badge${rank === 1 ? " td-rank-badge--first" : ""}${isMe ? " td-rank-badge--me" : ""}`}
                          >
                            {String(rank).padStart(2, "0")}
                          </span>
                        </span>
                        <span className="td-td td-td--user">
                          <ProfileIcon className="td-avatar" />
                          <span
                            className={`td-username${rank === 1 ? " td-username--first" : ""}${isMe ? " td-username--me" : ""}`}
                          >
                            {p.user?.username || "Unknown"}
                            {isMe && " (You)"}
                          </span>
                        </span>
                        <span className="td-td td-td--value">
                          ${formatCurrency(p.cash_balance || 0)}
                        </span>
                        <span className="td-td td-td--change td-change--neutral">
                          --
                        </span>
                      </div>
                    );
                  })}
                  {participants.length === 0 && (
                    <div className="td-table-empty">No participants yet.</div>
                  )}
                </div>
              </div>
            </section>

            {/* Community Discussion */}
            <section className="td-discussion">
              <div className="td-discussion-header">
                <h2 className="td-leaderboard-title">
                  Community Discussion
                </h2>
              </div>
              <div className="td-comment-input-area">
                <ProfileIcon className="td-avatar" />
                <div className="td-comment-input-wrap">
                  <textarea
                    className="td-comment-textarea"
                    placeholder="Share your strategies or thoughts..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <div className="td-comment-submit-row">
                    <Button variant="primary" size="small">
                      Post Comment
                    </Button>
                  </div>
                </div>
              </div>
              <div className="td-comments-empty">
                No comments yet. Start the conversation!
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="td-right-col">
            {/* Trading Console */}
            <div className="td-trade-panel">
              <div className="td-trade-panel-header">
                <BothwayIcon className="td-panel-icon" />
                <span className="td-panel-title">TRADING CONSOLE</span>
              </div>

              <div className="td-trade-form">
                <div className="td-trade-field">
                  <label className="td-trade-label">Select Ticker</label>
                  <StockSearchDropdown
                    stocks={stocks}
                    selected={selectedStock}
                    onSelect={setSelectedStock}
                  />
                </div>

                <div className="td-trade-field">
                  <label className="td-trade-label">Amount (USD)</label>
                  <div className="td-trade-input-wrap">
                    <span className="td-trade-dollar">$</span>
                    <input
                      type="number"
                      className="td-trade-input"
                      placeholder="0.00"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="td-trade-pct-row">
                    <button
                      type="button"
                      className="td-pct-btn"
                      onClick={() => setAmountPercent(25)}
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      className="td-pct-btn"
                      onClick={() => setAmountPercent(50)}
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      className="td-pct-btn"
                      onClick={() => setAmountPercent(75)}
                    >
                      75%
                    </button>
                    <button
                      type="button"
                      className="td-pct-btn"
                      onClick={() => setAmountPercent(100)}
                    >
                      Max
                    </button>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="td-trade-submit"
                  onClick={handleExecuteBuy}
                  disabled={!selectedStock || !tradeAmount}
                >
                  Execute Buy Order
                </Button>
              </div>
            </div>

            {/* Holdings Panel */}
            <div className="td-holdings-panel">
              <div className="td-holdings-header">
                <div className="td-holdings-title-row">
                  <WalletIcon className="td-panel-icon" />
                  <span className="td-panel-title">YOUR HOLDINGS</span>
                </div>
                <span className="td-holdings-cash">
                  ${formatCurrency(cashBalance)} Cash
                </span>
              </div>

              <div className="td-holdings-list">
                {holdings.length > 0 ? (
                  holdings.map((h) => {
                    const stockInfo = stocks.find(
                      (s) => s.symbol === h.symbol,
                    );
                    const isPositive = true;
                    return (
                      <div
                        key={h.symbol}
                        className={`td-holding-item ${isPositive ? "td-holding-item--positive" : "td-holding-item--negative"}`}
                      >
                        <div className="td-holding-left">
                          <div className="td-holding-name-row">
                            <span className="td-holding-symbol">
                              {h.symbol}
                            </span>
                            <span className="td-holding-company">
                              {stockInfo?.name || ""}
                            </span>
                          </div>
                          <span className="td-holding-gain td-holding-gain--positive">
                            ${formatCurrency(h.amount_invested || 0)}
                          </span>
                        </div>
                        <div className="td-holding-right">
                          <div className="td-holding-value-col">
                            <span className="td-holding-total">
                              ${formatCurrency(h.amount_invested || 0)}
                            </span>
                            <span className="td-holding-shares">
                              {h.shares} Shares
                            </span>
                          </div>
                          <button
                            type="button"
                            className="td-holding-sell-btn"
                            onClick={() =>
                              navigate(
                                `/tournaments/${id}/sell/${h.symbol}`,
                              )
                            }
                          >
                            <ShareIcon />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="td-holdings-empty">
                    No holdings yet. Use the trading console above.
                  </div>
                )}
              </div>

              <button
                type="button"
                className="td-leave-btn"
                onClick={handleLeave}
              >
                <CancelIcon className="td-leave-icon" />
                Leave Tournament
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default TournamentDetailJoined;