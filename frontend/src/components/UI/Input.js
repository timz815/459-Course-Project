import { forwardRef } from "react";
import "../../styles/Input.css";

/**
 * Input Component
 *
 * Reusable input field with optional label, icon support, and helper text.
 *
 * Props:
 * - label: string - Optional label text above the input
 * - icon: ReactNode - Optional icon to display inside the input container
 * - helper: string - Optional helper text below the input
 * - error: boolean - Whether to show error state styling
 * - className: string - Additional CSS classes for wrapper
 * - inputClassName: string - Additional CSS classes for input element
 * - errorText: string - Error message to display instead of helper text
 * - ...rest: all other props passed to input element (type, placeholder, value, onChange, etc)
 */
const Input = forwardRef(function Input(
  {
    label,
    icon,
    iconPosition = "right",
    helper,
    error = false,
    className,
    inputClassName,
    errorText,
    ...rest
  },
  ref,
) {
  return (
    <div className={`ui-input-field ${className || ""}`}>
      {label && <label className="ui-input-label">{label}</label>}

      <div
        className={`ui-input-wrap ${error ? "ui-input-error" : ""} ${icon ? `ui-input-with-icon-${iconPosition}` : ""}`}
      >
        <input
          ref={ref}
          className={`ui-input ${inputClassName || ""}`}
          {...rest}
        />
        {icon && <span className="ui-input-icon">{icon}</span>}
      </div>

      {(helper || errorText) && (
        <div
          className={`ui-input-helper ${error ? "ui-input-helper-error" : ""}`}
        >
          {errorText || helper}
        </div>
      )}
    </div>
  );
});

export default Input;
