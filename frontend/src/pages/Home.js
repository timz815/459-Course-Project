/**
 * Home Component
 *
 * Landing page with hero section for the stock market simulator application.
 *
 * Key behaviours:
 * - Displays prominent headline introducing the tournament concept
 * - Single primary call-to-action directing users to tournament listings
 * - Minimal layout focused on conversion to tournament discovery
 */

import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <Header />

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.headline}>
            Test Your Trading Skills in Stock Market Simulator Tournaments
          </h1>

          <button
            style={styles.cta}
            onClick={() => navigate("/tournaments")}
          >
            View Tournaments
          </button>
        </div>
      </section>
    </div>
  );
}

const BLUE = "#0F9FEA";
const BG = "#1A1A1A";
const TEXT = "#F9F9F9";

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: BG,
    color: TEXT,
    fontFamily: "'Segoe UI', sans-serif",
  },

  hero: {
    backgroundColor: BG,
    padding: "7.5rem 1.25rem",
  },

  heroContent: {
    maxWidth: "56.25rem",
    margin: "0 auto",
  },

  headline: {
    fontSize: "2.6rem",
    fontWeight: "700",
    color: TEXT,
    margin: "0 0 0.5rem",
    lineHeight: 1.2,
  },

  cta: {
    marginTop: "2.5rem",
    padding: "0.75rem 1.75rem",
    backgroundColor: BLUE,
    color: "#fff",
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
  },
};

export default Home;