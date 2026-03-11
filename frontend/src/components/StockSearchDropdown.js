/**
 * StockSearchDropdown Component
 *
 * Searchable dropdown for selecting a stock from the tournament universe.
 *
 * Key behaviours:
 * - Shows top 5 stocks by default when no search term
 * - Filters all 20 stocks live as user types
 * - Locks in selection on click, displays selected stock
 * - Closes on outside click
 * - Calls onSelect(stock) with full stock object when selected
 */

import { useState, useEffect, useRef } from "react";

const DEFAULT_SYMBOLS = ["AAPL", "NVDA", "MSFT", "AMZN", "TSLA"];

function StockSearchDropdown({ stocks, onSelect, selected }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Filter logic
  const filtered = query.trim()
    ? stocks.filter(
        (s) =>
          s.symbol.toLowerCase().includes(query.toLowerCase()) ||
          s.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : stocks.filter((s) => DEFAULT_SYMBOLS.includes(s.symbol));

  function handleSelect(stock) {
    onSelect(stock);
    setQuery("");
    setIsOpen(false);
  }

  function handleInputChange(e) {
    setQuery(e.target.value);
    setIsOpen(true);
    // Clear selection when user types again
    if (selected) onSelect(null);
  }

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.inputWrapper}>
        <svg style={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        {selected ? (
          // Show selected stock as a tag
          <div style={styles.selectedTag}>
            <span style={styles.selectedSymbol}>{selected.symbol}</span>
            <span style={styles.selectedName}>{selected.name}</span>
            <button
              type="button"
              style={styles.clearBtn}
              onClick={() => { onSelect(null); setQuery(""); }}
              aria-label="Clear selection"
            >
              ×
            </button>
          </div>
        ) : (
          <input
            type="text"
            placeholder="Search stocks…"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            style={styles.input}
            autoComplete="off"
          />
        )}
      </div>

      {isOpen && !selected && (
        <div style={styles.dropdown}>
          {filtered.length === 0 ? (
            <div style={styles.noResults}>No stocks found</div>
          ) : (
            <>
              {!query.trim() && (
                <div style={styles.dropdownLabel}>Popular</div>
              )}
              {filtered.map((stock) => (
                <button
                  key={stock.symbol}
                  type="button"
                  style={styles.option}
                  onClick={() => handleSelect(stock)}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#3a3a3a"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <div style={styles.optionLeft}>
                    <span style={styles.optionSymbol}>{stock.symbol}</span>
                    <span style={styles.optionName}>{stock.name}</span>
                  </div>
                  <div style={styles.optionRight}>
                    {stock.price ? (
                      <span style={styles.optionPrice}>${stock.price.toFixed(2)}</span>
                    ) : (
                      <span style={styles.optionPriceMuted}>—</span>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
    width: "100%",
  },
  inputWrapper: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#1f1f1f",
    border: "1px solid #444",
    borderRadius: "0.5rem",
    padding: "0 0.75rem",
    minHeight: "2.75rem",
  },
  searchIcon: {
    flexShrink: 0,
    marginRight: "0.5rem",
  },
  input: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    color: "#F9F9F9",
    fontSize: "1rem",
    padding: "0.625rem 0",
    fontFamily: "inherit",
  },
  selectedTag: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flex: 1,
    padding: "0.375rem 0",
  },
  selectedSymbol: {
    fontWeight: "700",
    color: "#F9F9F9",
    fontSize: "0.95rem",
  },
  selectedName: {
    color: "#888",
    fontSize: "0.85rem",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: "#666",
    fontSize: "1.2rem",
    cursor: "pointer",
    padding: "0 0.25rem",
    lineHeight: 1,
    fontFamily: "inherit",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 0.375rem)",
    left: 0,
    right: 0,
    backgroundColor: "#2a2a2a",
    border: "1px solid #444",
    borderRadius: "0.5rem",
    boxShadow: "0 0.5rem 1.5rem rgba(0,0,0,0.5)",
    zIndex: 200,
    overflow: "hidden",
  },
  dropdownLabel: {
    padding: "0.5rem 0.875rem 0.25rem",
    fontSize: "0.7rem",
    fontWeight: "600",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  option: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.625rem 0.875rem",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "background-color 0.1s",
    fontFamily: "inherit",
  },
  optionLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
    overflow: "hidden",
  },
  optionSymbol: {
    fontWeight: "700",
    color: "#F9F9F9",
    fontSize: "0.9rem",
    minWidth: "3.5rem",
  },
  optionName: {
    color: "#888",
    fontSize: "0.82rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  optionRight: {
    flexShrink: 0,
    marginLeft: "0.5rem",
  },
  optionPrice: {
    color: "#F9F9F9",
    fontSize: "0.85rem",
    fontWeight: "600",
  },
  optionPriceMuted: {
    color: "#555",
    fontSize: "0.85rem",
  },
  noResults: {
    padding: "1rem",
    color: "#666",
    fontSize: "0.9rem",
    textAlign: "center",
  },
};

export default StockSearchDropdown;