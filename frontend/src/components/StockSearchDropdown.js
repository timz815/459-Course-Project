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
import Input from "./UI/Input";
import "../styles/StockSearchDropdown.css";

const DEFAULT_SYMBOLS = ["AAPL", "NVDA", "MSFT", "AMZN", "TSLA"];

function StockSearchDropdown({ stocks, onSelect, selected }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside the component
  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Filter stocks based on search query or show defaults
  const filtered = query.trim()
    ? stocks
        .filter(
          (s) =>
            s.symbol.toLowerCase().includes(query.toLowerCase()) ||
            s.name.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 8)
    : stocks.filter((s) => DEFAULT_SYMBOLS.includes(s.symbol));

  // Handle stock selection from dropdown
  function handleSelect(stock) {
    onSelect(stock);
    setQuery("");
    setIsOpen(false);
  }

  // Handle input changes and clear previous selection
  function handleInputChange(e) {
    setQuery(e.target.value);
    setIsOpen(true);
    if (selected) onSelect(null);
  }

  return (
    <div ref={containerRef} className="stock-search">
      {selected ? (
        <div className="stock-search-selected">
          <span className="stock-search-selected-symbol">
            {selected.symbol}
          </span>
          <span className="stock-search-selected-name">{selected.name}</span>
          <button
            type="button"
            className="stock-search-remove"
            onClick={() => {
              onSelect(null);
              setQuery("");
            }}
            aria-label="Clear selection"
          >
            ×
          </button>
        </div>
      ) : (
        <Input
          type="text"
          placeholder="Search stocks…"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          inputClassName="stock-search-input"
          autoComplete="off"
        />
      )}

      {isOpen && !selected && (
        <div className="stock-search-results">
          {filtered.length === 0 ? (
            <div className="stock-search-empty">No stocks found</div>
          ) : (
            <>
              {!query.trim() && (
                <div className="stock-search-section-label">Popular</div>
              )}
              {filtered.map((stock) => (
                <button
                  key={stock.symbol}
                  type="button"
                  className="stock-search-item"
                  onClick={() => handleSelect(stock)}
                >
                  <div className="stock-search-info">
                    <span className="stock-search-symbol">{stock.symbol}</span>
                    <span className="stock-search-name">{stock.name}</span>
                  </div>
                  <div className="stock-search-price-wrap">
                    {stock.price ? (
                      <span className="stock-search-price">
                        ${stock.price.toFixed(2)}
                      </span>
                    ) : (
                      <span className="stock-search-price--unavailable">—</span>
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

export default StockSearchDropdown;
