import { useEffect, useMemo, useRef, useState } from "react";
import { ReactComponent as DropdownIcon } from "../../assets/Icon_16x16/Dropdown_16x16.svg";
import "../../styles/FilterDropdown.css";

function FilterDropdown({
  value,
  options,
  onChange,
  className = "",
  triggerClassName = "",
  menuClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || options[0],
    [options, value],
  );

  useEffect(() => {
    function handleOutsideClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className={`filter-dropdown ${className}`.trim()} ref={ref}>
      <button
        type="button"
        className={`filter-dropdown-trigger ${triggerClassName}`.trim()}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className="filter-dropdown-label"
          style={
            selectedOption?.color ? { color: selectedOption.color } : undefined
          }
        >
          {selectedOption?.label}
        </span>
        <DropdownIcon className="filter-dropdown-chevron" />
      </button>

      {open && (
        <div
          className={`filter-dropdown-menu ${menuClassName}`.trim()}
          role="listbox"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`filter-dropdown-option ${value === opt.value ? "filter-dropdown-option--selected" : ""}`}
              style={opt.color ? { color: opt.color } : undefined}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default FilterDropdown;
