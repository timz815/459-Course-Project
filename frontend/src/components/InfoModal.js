import { useRef } from "react";
import "../styles/InfoModal.css";

/**
 * InfoModal — generic message / detail popup.
 *
 * Props:
 *   title    — heading text
 *   onClose  — called when X button or overlay is clicked
 *   children — body content
 */
function InfoModal({ title, onClose, children }) {
  const overlayRef = useRef(null);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div className="im-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="im-modal">
        {/* Header */}
        <div className="im-header">
          <h2 className="im-title">{title}</h2>
          <button
            type="button"
            className="im-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="im-body">{children}</div>
      </div>
    </div>
  );
}

export default InfoModal;
