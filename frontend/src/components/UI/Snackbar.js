import CompletedIcon from "../../assets/Icon_24x24/Completed_24x24.svg";
import CautionTertiaryIcon from "../../assets/Icon_24x24/Caution-Tertiary_24x24.svg";
import AlertIcon from "../../assets/Icon_24x24/Alert_24x24.svg";
import "../../styles/Snackbar.css";

function Snackbar({
  message,
  type = "success",
  className = "",
  onDismiss,
  dismissLabel = "dismiss",
}) {
  if (!message) return null;

  const normalizedType =
    type === "Completed"
      ? "success"
      : type === "Warning"
        ? "error"
        : type === "Notification"
          ? "notification"
          : type;

  const iconSrc =
    normalizedType === "success"
      ? CompletedIcon
      : normalizedType === "error"
        ? CautionTertiaryIcon
        : AlertIcon;

  const typeClass =
    normalizedType === "success"
      ? "ui-snackbar-success"
      : normalizedType === "error"
        ? "ui-snackbar-error"
        : "ui-snackbar-notification";

  return (
    <div
      className={`ui-snackbar ${typeClass} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <div className="ui-snackbar-main">
        <img
          src={iconSrc}
          alt=""
          className="ui-snackbar-icon"
          aria-hidden="true"
        />
        <p className="ui-snackbar-text">{message}</p>
      </div>

      <button type="button" className="ui-snackbar-dismiss" onClick={onDismiss}>
        {dismissLabel}
      </button>
    </div>
  );
}

export default Snackbar;
