import "../../styles/VerticalScrollbar.css";
import { useRef } from "react";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function VerticalScrollbar({
  thumbTopPct = 0,
  thumbHeightPct = 35,
  onThumbPositionChange,
}) {
  const rootRef = useRef(null);
  const draggingRef = useRef(false);
  const dragOffsetPctRef = useRef(0);

  const safeHeight = clamp(thumbHeightPct, 18, 100);
  const safeTop = clamp(thumbTopPct, 0, Math.max(0, 100 - safeHeight));

  function updateFromClientY(clientY) {
    if (!rootRef.current || !onThumbPositionChange) return;

    const rect = rootRef.current.getBoundingClientRect();
    if (rect.height <= 0) return;

    const pointerPct = ((clientY - rect.top) / rect.height) * 100;
    const maxTop = Math.max(0, 100 - safeHeight);
    const nextTop = clamp(pointerPct - dragOffsetPctRef.current, 0, maxTop);
    onThumbPositionChange(nextTop);
  }

  function onPointerMove(e) {
    if (!draggingRef.current) return;
    e.preventDefault();
    updateFromClientY(e.clientY);
  }

  function stopDragging() {
    draggingRef.current = false;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDragging);
  }

  function startDragging(e) {
    if (!onThumbPositionChange) return;
    e.preventDefault();

    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect || rect.height <= 0) return;

    const pointerPct = ((e.clientY - rect.top) / rect.height) * 100;
    const isInsideCurrentThumb =
      pointerPct >= safeTop && pointerPct <= safeTop + safeHeight;

    // If user clicks outside the thumb, center the thumb under pointer.
    dragOffsetPctRef.current = isInsideCurrentThumb
      ? pointerPct - safeTop
      : safeHeight / 2;

    draggingRef.current = true;
    updateFromClientY(e.clientY);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
  }

  return (
    <div
      ref={rootRef}
      className="ui-vscroll"
      aria-hidden="true"
      onPointerDown={startDragging}
    >
      <div className="ui-vscroll-track">
        <div
          className="ui-vscroll-thumb"
          style={{
            height: `${safeHeight}%`,
            top: `${safeTop}%`,
          }}
        />
      </div>
    </div>
  );
}

export default VerticalScrollbar;
