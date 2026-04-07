/**
 * TournamentDetailJoined Component
 *
 * Full tournament view for participants. Includes performance bento,
 * leaderboard, trading console sidebar, holdings, and community discussion.
 */

import { useEffect, useRef, useState } from "react";
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
import { ReactComponent as ThumbsupIcon } from "../assets/Icon_Others/Thumbsup.svg";
import { ReactComponent as ReplyIcon } from "../assets/Icon_Others/Reply.svg";
import TradeConfirmModal from "../components/TradeConfirmModal";
import { isPendingUntilOpen } from "../utils/marketHours";
import "../styles/TournamentDetail.css";

function formatTimeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return "JUST NOW";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} MINUTE${minutes !== 1 ? "S" : ""} AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} HOUR${hours !== 1 ? "S" : ""} AGO`;
  const days = Math.floor(hours / 24);
  return `${days} DAY${days !== 1 ? "S" : ""} AGO`;
}

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

function mergeHoldingsBySymbol(holdings) {
  const merged = new Map();

  for (const holding of holdings || []) {
    const symbol = holding?.symbol?.toUpperCase?.();
    if (!symbol) continue;

    const existing = merged.get(symbol);
    if (existing) {
      existing.shares = parseFloat(
        ((existing.shares || 0) + (holding.shares || 0)).toFixed(1),
      );
      existing.amount_invested = parseFloat(
        (
          (existing.amount_invested || 0) + (holding.amount_invested || 0)
        ).toFixed(2),
      );
    } else {
      merged.set(symbol, {
        ...holding,
        symbol,
        shares: parseFloat(((holding.shares || 0) * 1).toFixed(1)),
        amount_invested: parseFloat(
          ((holding.amount_invested || 0) * 1).toFixed(2),
        ),
      });
    }
  }

  return Array.from(merged.values());
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
  const [selectedStock, setSelectedStock] = useState(null);
  const [tradeAmount, setTradeAmount] = useState("");
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentFilter, setCommentFilter] = useState("all");
  const [isBuyConfirmOpen, setIsBuyConfirmOpen] = useState(false);
  const [submittingBuy, setSubmittingBuy] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [buyWarnings, setBuyWarnings] = useState([]);
  const [isSellConfirmOpen, setIsSellConfirmOpen] = useState(false);
  const [sellTargetHolding, setSellTargetHolding] = useState(null);
  const [submittingSell, setSubmittingSell] = useState(false);
  const [sellError, setSellError] = useState("");
  const commentInputRef = useRef(null);

  const cashBalance = myParticipant?.cash_balance ?? 0;
  const holdings = mergeHoldingsBySymbol(myParticipant?.holdings || []);
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

  useEffect(() => {
    fetch(`http://localhost:5000/api/tournaments/${id}/comments`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setComments(
            data.map((c) => ({
              id: c._id,
              author: c.user?.username || "Unknown",
              avatarUrl: c.user?.avatarUrl || "",
              timeAgo: formatTimeAgo(c.createdAt),
              body: c.text,
              type: c.type || "comment",
              side: c.side || null,
              likes: 0,
              likedByMe: false,
            })),
          );
        }
      })
      .catch(() => {});
  }, [id]);

  async function handlePostComment() {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/tournaments/${id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token },
          body: JSON.stringify({ text: commentText }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setComments((prev) => [
          {
            id: data._id,
            author: data.user?.username || "Unknown",
            avatarUrl: data.user?.avatarUrl || "",
            timeAgo: "JUST NOW",
            body: data.text,
            type: "comment",
            side: null,
            likes: 0,
            likedByMe: false,
          },
          ...prev,
        ]);
        setCommentText("");
      }
    } catch {
      // silent fail
    } finally {
      setSubmittingComment(false);
    }
  }

  function handleToggleLike(commentId) {
    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id !== commentId) return comment;
        const likedByMe = !comment.likedByMe;
        return {
          ...comment,
          likedByMe,
          likes: Math.max(0, comment.likes + (likedByMe ? 1 : -1)),
        };
      }),
    );
  }

  function handleReply(comment) {
    const mention = `@${comment.author} `;
    setCommentText((prev) =>
      prev.trimStart().startsWith(mention.trim()) ? prev : `${mention}${prev}`,
    );
    if (commentInputRef.current) {
      commentInputRef.current.focus();
      commentInputRef.current.setSelectionRange(mention.length, mention.length);
    }
  }

  async function pollUntilExecuted(queueId) {
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(
            `http://localhost:5000/api/tournaments/${id}/trades/queue`,
            { headers: { Authorization: token } },
          );
          const pending = await res.json();
          const stillPending = pending.some((t) => t._id === queueId);
          if (!stillPending) {
            clearInterval(interval);
            resolve();
          }
        } catch (err) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });
  }

  function handleExecuteBuy() {
    if (!selectedStock || Number(tradeAmount) <= 0) return;
    setBuyError("");

    const amount = parseFloat(tradeAmount);
    const warnings = [];

    if (isPendingUntilOpen()) {
      warnings.push({
        type: "info",
        message: "Market is currently closed. Your trade will be queued and executed at the next market open.",
      });
    }

    const estimatedSharesAtSubmit = selectedStock.price
      ? parseFloat((amount / selectedStock.price).toFixed(1))
      : null;
    if (estimatedSharesAtSubmit !== null && estimatedSharesAtSubmit <= 0) {
      warnings.push({
        type: "error",
        message: "Amount is too small to purchase any shares at the current price. Please increase your order.",
      });
    }

    if (amount > cashBalance) {
      warnings.push({
        type: "error",
        message: `Insufficient funds. You have $${cashBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}, but this order requires $${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`,
      });
    }

    setBuyWarnings(warnings);
    setIsBuyConfirmOpen(true);
  }

  async function handleConfirmBuySubmit() {
    const amount = parseFloat(tradeAmount);
    if (!selectedStock || !amount || amount <= 0) return;
    if (amount > cashBalance) {
      setBuyError("Amount exceeds your available cash balance.");
      return;
    }

    setSubmittingBuy(true);
    setBuyError("");

    try {
      const res = await fetch(
        `http://localhost:5000/api/tournaments/${id}/trades`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token },
          body: JSON.stringify({
            symbol: selectedStock.symbol.toUpperCase(),
            side: "buy",
            dollar_amount: amount,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setBuyError(data.message || "Failed to queue trade.");
        setSubmittingBuy(false);
        setIsBuyConfirmOpen(false);
        return;
      }

      await pollUntilExecuted(data.queueId);
      window.location.reload();
    } catch (err) {
      setBuyError("Server error. Please try again.");
      setSubmittingBuy(false);
      setIsBuyConfirmOpen(false);
    }
  }

  function openSellModal(holding) {
    setSellError("");
    setSellTargetHolding(holding);
    setIsSellConfirmOpen(true);
  }

  function getSellStockInfo(holding) {
    if (!holding) return null;
    return stocks.find((s) => s.symbol === holding.symbol) || null;
  }

  function getSellDollarAmount(holding, stockInfo) {
    if (!holding) return 0;
    if (stockInfo?.price && holding.shares) {
      return Number(stockInfo.price) * Number(holding.shares);
    }
    return Number(holding.amount_invested || 0);
  }

  async function handleConfirmSellSubmit() {
    if (!sellTargetHolding) return;

    const stockInfo = getSellStockInfo(sellTargetHolding);
    const dollarAmount = getSellDollarAmount(sellTargetHolding, stockInfo);

    if (!dollarAmount || dollarAmount <= 0) {
      setSellError("Unable to calculate liquidation amount.");
      return;
    }

    setSubmittingSell(true);
    setSellError("");

    try {
      const res = await fetch(
        `http://localhost:5000/api/tournaments/${id}/trades`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token },
          body: JSON.stringify({
            symbol: sellTargetHolding.symbol.toUpperCase(),
            side: "sell",
            dollar_amount: dollarAmount,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setSellError(data.message || "Failed to queue sell trade.");
        setSubmittingSell(false);
        return;
      }

      await pollUntilExecuted(data.queueId);
      window.location.reload();
    } catch (err) {
      setSellError("Server error. Please try again.");
      setSubmittingSell(false);
    }
  }

  const investAmount = parseFloat(tradeAmount) || 0;
  const estimatedShares =
    selectedStock?.price && investAmount > 0
      ? (investAmount / selectedStock.price).toFixed(3)
      : "0.000";

  const sellStockInfo = getSellStockInfo(sellTargetHolding);
  const sellDollarAmount = getSellDollarAmount(
    sellTargetHolding,
    sellStockInfo,
  );
  const sellShares = Number(sellTargetHolding?.shares || 0);
  const sellChangePct = Number(sellStockInfo?.changePct);
  const sellChangeText = Number.isFinite(sellChangePct)
    ? `${sellChangePct >= 0 ? "+" : ""}${sellChangePct.toFixed(1)}% Today`
    : "-- Today";

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
                <span className="td-bento-big-value">#{myRank || "--"}</span>
                {myRank > 0 &&
                  myRank <= Math.ceil(participants.length * 0.05) && (
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
                <span className="td-bento-big-value">{holdings.length}</span>
                <span className="td-bento-sub td-bento-sub--muted">
                  Win Rate: --
                </span>
              </div>
            </div>

            {/* Leaderboard */}
            <section className="td-leaderboard">
              <div className="td-leaderboard-header">
                <h2 className="td-leaderboard-title">Tournament Leaderboard</h2>
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
                      user && (p.user?._id === user.id || p.user === user.id);
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
                          {p.user?.avatarUrl ? (
                            <img
                              src={p.user.avatarUrl}
                              alt={`${p.user?.username || "User"} avatar`}
                              className="td-avatar"
                            />
                          ) : (
                            <ProfileIcon className="td-avatar" />
                          )}
                          <span
                            className={`td-username${rank === 1 ? " td-username--first" : ""}${isMe ? " td-username--me" : ""}`}
                          >
                            {p.user?.username || "Unknown"}
                            {isMe && " (You)"}
                          </span>
                        </span>
                        <span className="td-td td-td--value">
                          ${formatCurrency(p.portfolio_value ?? p.cash_balance ?? 0)}
                        </span>
                        <span className={`td-td td-td--change ${
                          p.day_change == null ? "td-change--neutral" :
                          p.day_change > 0 ? "td-change--positive" :
                          p.day_change < 0 ? "td-change--negative" :
                          "td-change--neutral"
                        }`}>
                          {p.day_change == null ? "--" :
                            `${p.day_change >= 0 ? "+" : ""}$${formatCurrency(p.day_change)}`}
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
                <h2 className="td-leaderboard-title">Community Discussion</h2>
                <div className="td-discussion-filters">
                  {["all", "comments", "trades"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`td-discussion-filter-btn${commentFilter === f ? " td-discussion-filter-btn--active" : ""}`}
                      onClick={() => setCommentFilter(f)}
                    >
                      {f === "all" ? "All" : f === "comments" ? "Comments" : "Trades"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="td-comment-input-area">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="Your avatar"
                    className="td-avatar"
                  />
                ) : (
                  <ProfileIcon className="td-avatar" />
                )}
                <div className="td-comment-input-wrap">
                  <textarea
                    ref={commentInputRef}
                    className="td-comment-textarea"
                    placeholder="Share your strategies or thoughts..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <div className="td-comment-submit-row">
                    <Button
                      variant="primary"
                      size="small"
                      className="td-comment-post-btn"
                      onClick={handlePostComment}
                      disabled={submittingComment || !commentText.trim()}
                    >
                      {submittingComment ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="td-comments-list">
                {comments.filter((c) =>
                  commentFilter === "all" ? true :
                  commentFilter === "comments" ? c.type === "comment" :
                  c.type === "trade"
                ).map((comment) => (
                  <article key={comment.id} className="td-comment-card">
                    {comment.avatarUrl ? (
                      <img
                        src={comment.avatarUrl}
                        alt={`${comment.author} avatar`}
                        className="td-avatar"
                      />
                    ) : (
                      <ProfileIcon className="td-avatar" />
                    )}
                    <div className="td-comment-content">
                      <header className="td-comment-top">
                        <p className="td-comment-author">{comment.author}</p>
                        <time className="td-comment-time">
                          {comment.timeAgo}
                        </time>
                      </header>
                      <p className="td-comment-body">
                        {comment.type === "trade" && (
                          <span className={`td-trade-badge td-trade-badge--${comment.side}`}>
                            {comment.side === "buy" ? "BUY" : "SELL"}
                          </span>
                        )}
                        {comment.body}
                      </p>
                      <div className="td-comment-actions">
                        <button
                          type="button"
                          className="td-comment-action-btn"
                          onClick={() => handleToggleLike(comment.id)}
                          aria-label={`Like comment from ${comment.author}`}
                        >
                          <ThumbsupIcon className="td-comment-action-icon td-comment-action-icon--thumb" />
                          <span className="td-comment-like-count">
                            {comment.likes}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="td-comment-action-btn"
                          onClick={() => handleReply(comment)}
                          aria-label={`Reply to ${comment.author}`}
                        >
                          <ReplyIcon className="td-comment-action-icon td-comment-action-icon--reply" />
                          <span className="td-comment-reply-text">Reply</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="td-discussion-footer">
                <button type="button" className="td-discussion-load-more">
                  Load More Comments
                </button>
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
                  disabled={
                    !selectedStock ||
                    !tradeAmount ||
                    Number(tradeAmount) <= 0 ||
                    Number(tradeAmount) > cashBalance
                  }
                >
                  Execute Buy Order
                </Button>
                {Number(tradeAmount) > cashBalance && (
                  <p className="td-trade-error">
                    Amount exceeds available cash.
                  </p>
                )}
                {buyError && <p className="td-trade-error">{buyError}</p>}
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
                    const stockInfo = stocks.find((s) => s.symbol === h.symbol);
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
                            onClick={() => openSellModal(h)}
                            aria-label={`Sell ${h.symbol}`}
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

      {isBuyConfirmOpen && (
        <TradeConfirmModal
          side="buy"
          symbol={selectedStock?.symbol}
          companyName={selectedStock?.name}
          price={selectedStock?.price}
          amount={investAmount}
          shares={estimatedShares || "0.000"}
          onConfirm={handleConfirmBuySubmit}
          onCancel={() => {
            if (!submittingBuy) {
              setIsBuyConfirmOpen(false);
              setBuyError("");
              setBuyWarnings([]);
            }
          }}
          submitting={submittingBuy}
          warnings={buyWarnings}
        />
      )}

      {isSellConfirmOpen && (
        <div className="td-modal-overlay" role="dialog" aria-modal="true">
          <div className="td-sell-modal">
            <div className="td-sell-modal-header">
              <h2 className="td-sell-modal-title">Confirm Sell Order</h2>
              <p className="td-sell-modal-subtitle">
                Review your transaction before execution
              </p>
            </div>

            <div className="td-sell-modal-content">
              <div className="td-sell-stock-summary">
                <div>
                  <p className="td-sell-stock-symbol">
                    {sellTargetHolding?.symbol}
                  </p>
                  <p className="td-sell-stock-name">
                    {sellStockInfo?.name || ""}
                  </p>
                </div>
                <div className="td-sell-current-price-wrap">
                  <p className="td-sell-current-price-value">
                    ${formatCurrency(sellStockInfo?.price || 0)}
                  </p>
                  <p className="td-sell-current-price-change">
                    {sellChangeText}
                  </p>
                </div>
              </div>

              <div className="td-sell-details">
                <div className="td-sell-detail-row">
                  <span>Shares to Sell</span>
                  <span>{sellShares.toFixed(2)}</span>
                </div>
                <div className="td-sell-detail-row">
                  <span>Estimated Proceeds</span>
                  <span>${formatCurrency(sellDollarAmount)}</span>
                </div>
                <div className="td-sell-detail-row">
                  <span>Transaction Fee</span>
                  <span className="td-sell-fee">Paper Account ($0.00)</span>
                </div>
              </div>

              <div className="td-sell-total-inset">
                <p className="td-sell-total-label">Total Liquidation Value</p>
                <p className="td-sell-total-value">
                  ${formatCurrency(sellDollarAmount)}
                </p>
              </div>
            </div>

            <div className="td-sell-modal-actions">
              <Button
                variant="cancel"
                className="td-sell-confirm-btn"
                headIcon={<ShareIcon />}
                onClick={handleConfirmSellSubmit}
                disabled={submittingSell}
              >
                {submittingSell ? "Submitting..." : "Confirm & Sell"}
              </Button>
              <button
                type="button"
                className="td-sell-cancel-btn"
                onClick={() => {
                  if (!submittingSell) {
                    setIsSellConfirmOpen(false);
                    setSellError("");
                  }
                }}
                disabled={submittingSell}
              >
                Cancel
              </button>
              {sellError && <p className="td-sell-error">{sellError}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TournamentDetailJoined;
