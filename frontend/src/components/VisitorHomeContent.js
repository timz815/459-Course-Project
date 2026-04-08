import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/VisitorHomeContent.css";
import Button from "./UI/Button";
import { ReactComponent as ArrowRiseIcon } from "../assets/Icon_16x16/Arrow-Rise_16x16.svg";
import defenseIcon24 from "../assets/Icon_24x24/Defense_24x24.svg";
import groupIcon24 from "../assets/Icon_24x24/Group_24x24.svg";
import riseDiagramIcon32 from "../assets/Icon_32x32/Rise-Diagram_32x32.svg";
import riseStarsIcon32 from "../assets/Icon_32x32/Rise-Stars_32x32.svg";
import { ReactComponent as RightIcon16 } from "../assets/Icon_16x16/Right_16x16.svg";
import trophyIcon32 from "../assets/Icon_32x32/Trophy_32x32.svg";

const FEATURE_CARDS = [
  {
    title: "Institutional Grade",
    text: "Built for serious, competitive paper trading in classroom and team environments.",
    icon: defenseIcon24,
    iconAlt: "Institutional grade icon",
  },
  {
    title: "Social Hub",
    text: "Compete on live leaderboards, track participants, and climb the rankings.",
    icon: groupIcon24,
    iconAlt: "Social hub icon",
  },
  {
    title: "Advanced Analytics",
    text: "Track portfolio value, cash balance, and holdings with live tournament updates.",
    icon: riseStarsIcon32,
    iconAlt: "Advanced analytics icon",
  },
];

function VisitorHomeContent() {
  const navigate = useNavigate();
  const [visibleTournaments, setVisibleTournaments] = useState([]);
  const [liveArena, setLiveArena] = useState(null);
  const [liveParticipants, setLiveParticipants] = useState(0);

  useEffect(() => {
    async function fetchTournaments() {
      try {
        const res = await fetch("http://localhost:5001/api/tournaments");
        const data = await res.json();
        if (!Array.isArray(data)) return;

        const currentArena =
          data.find((t) => t.status === "active") ||
          data
            .filter((t) => t.status === "open")
            .sort(
              (a, b) => new Date(a.start_date) - new Date(b.start_date),
            )[0] ||
          null;

        if (currentArena) {
          setLiveArena(currentArena);

          try {
            const participantsRes = await fetch(
              `http://localhost:5001/api/tournaments/${currentArena._id}/participants`,
            );
            const participantsData = await participantsRes.json();
            setLiveParticipants(
              Array.isArray(participantsData) ? participantsData.length : 0,
            );
          } catch (participantErr) {
            console.error(
              "Error fetching live arena participants:",
              participantErr,
            );
            setLiveParticipants(0);
          }
        } else {
          setLiveArena(null);
          setLiveParticipants(0);
        }

        const activeAndOpen = data
          .filter((t) => t.status === "active" || t.status === "open")
          .sort((a, b) => {
            if (a.status === "active" && b.status !== "active") return -1;
            if (a.status !== "active" && b.status === "active") return 1;
            return new Date(a.start_date) - new Date(b.start_date);
          });

        setVisibleTournaments(activeAndOpen);
      } catch (err) {
        console.error("Error fetching open tournaments:", err);
      }
    }

    fetchTournaments();
  }, []);

  const browseLabel = useMemo(() => {
    if (visibleTournaments.length === 0) return "Browse all tournaments";
    return `Browse all ${visibleTournaments.length} tournaments`;
  }, [visibleTournaments.length]);

  function formatDate(dateValue) {
    if (!dateValue) return "TBD";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "TBD";
    return date
      .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
      .toUpperCase();
  }

  function formatCurrency(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "$0";
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }

  function formatNumber(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "0";
    return amount.toLocaleString("en-US");
  }

  const livePool = useMemo(() => {
    if (!liveArena) return 0;
    // If prize_pool is explicitly set and valid, use it
    const explicitPool = Number(liveArena.prize_pool);
    if (Number.isFinite(explicitPool) && explicitPool > 0) {
      return explicitPool;
    }
    // Otherwise, calculate pool as starting_balance * participants
    const startingBalance = Number(liveArena.starting_balance);
    if (!Number.isFinite(startingBalance) || startingBalance <= 0) {
      return 0;
    }
    //  If we have a live arena and participants, calculate the pool; otherwise, just return starting balance
    if (liveParticipants > 0) {
      return startingBalance * liveParticipants;
    }

    return startingBalance;
  }, [liveArena, liveParticipants]);

  return (
    <main className="visitor-home" data-node-id="26:31">
      <div className="visitor-home-inner">
        <section className="vh-hero" data-node-id="26:33">
          <div className="vh-hero-gradient" aria-hidden="true" />

          <div className="vh-hero-content">
            <div className="vh-hero-top">
              <p className="vh-eyebrow">Institutional Simulation Platform</p>

              <h1 className="vh-title">
                Test Your Trading <span>Skills</span> in Stock Market Simulator
                Tournaments
              </h1>
            </div>

            <div className="vh-hero-bottom">
              <div className="vh-hero-left">
                <p className="vh-subtitle">
                  Compete in zero-risk paper-trading tournaments using live
                  market quotes, fair order processing, and dynamic
                  leaderboards.
                </p>

                <div className="vh-hero-actions">
                  <Button
                    variant="primary"
                    tailIcon={<ArrowRiseIcon />}
                    onClick={() => navigate("/tournaments")}
                  >
                    View Tournaments
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const el = document.getElementById("visitor-features");
                      el?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                  >
                    Learn More
                  </Button>
                </div>
              </div>

              <aside className="vh-hero-card" aria-label="Live arena stats">
                <div className="vh-chip-row">
                  <span className="vh-chip-label">Live Active Arena</span>
                  <span className="vh-chip-live">Live</span>
                </div>

                <div className="vh-card-stats">
                  <div className="vh-stat-row">
                    <span>Tournament Pool</span>
                    <strong>{formatCurrency(livePool)}</strong>
                  </div>
                  <div className="vh-divider" />
                  <div className="vh-stat-row">
                    <span>Participants</span>
                    <strong className="vh-value-neutral">
                      {formatNumber(liveParticipants)}
                    </strong>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section
          id="visitor-features"
          className="vh-features"
          data-node-id="26:73"
        >
          <article className="vh-main-feature" data-node-id="26:104">
            <div className="vh-icon" aria-hidden="true">
              <img src={riseDiagramIcon32} alt="" className="vh-icon-img" />
            </div>
            <h2>Market Data Engine</h2>
            <p>
              We ingest live market quotes from Finnhub and process them through
              a server-side queue built for fair tournament play. Orders are
              handled in timestamp order with market-hour rules, so every
              participant competes on the same synchronized data.
            </p>

            <div className="vh-metrics">
              <div>
                <label>Update Cycle</label>
                <strong>1s Queue</strong>
              </div>
              <div>
                <label>Source</label>
                <strong>Finnhub Quotes</strong>
              </div>
            </div>
          </article>

          <article className="vh-prize-card" data-node-id="26:74">
            <div>
              <div className="vh-icon dark" aria-hidden="true">
                <img src={trophyIcon32} alt="" className="vh-icon-img" />
              </div>
              <h3>Daily Prizes</h3>
              <p>
                Compete in daily challenges for real cash prizes and
                professional trader credentials.
              </p>
            </div>
            <button
              type="button"
              className="vh-link-btn"
              onClick={() => navigate("/tournaments")}
            >
              <span>Explore Rewards</span>
              <RightIcon16 className="vh-link-btn-icon" aria-hidden="true" />
            </button>
          </article>

          {FEATURE_CARDS.map((item) => (
            <article key={item.title} className="vh-small-card">
              <div className="vh-icon" aria-hidden="true">
                <img src={item.icon} alt="" className="vh-icon-img" />
              </div>
              <h4>{item.title}</h4>
              <p>{item.text}</p>
            </article>
          ))}
        </section>

        <section className="vh-tournaments" data-node-id="26:124">
          <div className="vh-section-head">
            <div>
              <p className="vh-eyebrow">Active Arenas</p>
              <h2>Live and Upcoming Tournaments</h2>
            </div>
            <button
              type="button"
              className="vh-browse-link"
              onClick={() => navigate("/tournaments")}
            >
              {browseLabel}
            </button>
          </div>

          <div className="vh-list">
            {visibleTournaments.length === 0 ? (
              <article className="vh-list-item vh-list-empty">
                <div className="vh-list-left">
                  <div>
                    <h3>No Active or Open Tournaments Right Now</h3>
                    <p>
                      <span>Check back soon for upcoming arenas.</span>
                    </p>
                  </div>
                </div>
              </article>
            ) : (
              visibleTournaments.map((tourney) => {
                const entryFee = Number(tourney.entry_fee);
                const hasEntryFee = Number.isFinite(entryFee) && entryFee > 0;

                return (
                  <article
                    key={tourney._id}
                    className="vh-list-item"
                    data-node-id="26:132"
                  >
                    <div className="vh-list-left">
                      <div>
                        <h3>{tourney.name}</h3>
                        <p>
                          <span>{`Starts: ${formatDate(tourney.start_date)}`}</span>
                          <span className={hasEntryFee ? "danger" : "success"}>
                            {`Entry: ${hasEntryFee ? formatCurrency(entryFee) : "Free"}`}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="vh-list-right">
                      <div>
                        <label>Prize Pool</label>
                        <strong>
                          {formatCurrency(
                            tourney.prize_pool ?? tourney.starting_balance,
                          )}
                        </strong>
                      </div>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => navigate(`/tournaments/${tourney._id}`)}
                      >
                        Join Arena
                      </Button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="vh-cta" data-node-id="26:172">
          <h2>Ready to Master the Markets?</h2>
          <p>
            Join over 50,000 traders honing their skills on the world&apos;s
            most precise simulation platform.
          </p>
          <Button variant="primary" onClick={() => navigate("/register")}>
            Create Free Account
          </Button>
        </section>
      </div>
    </main>
  );
}

export default VisitorHomeContent;
