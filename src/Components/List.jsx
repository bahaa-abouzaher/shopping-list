import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MdCheck, MdClose, MdDragIndicator } from "react-icons/md";

const holdDuration = 500;
const movementTolerance = 8;

export function DragPreview({ entry }) {
  return (
    <div className="item-row drag-preview" data-bought={entry.bought} aria-hidden="true">
      <span className="row-icon drag-handle"><MdDragIndicator /></span>
      <span className="item-label"><span className="item-name">{entry.item}</span></span>
      <span className="row-icon"><MdClose /></span>
    </div>
  );
}

export default function List({ entry, onToggle, onRename, onDelete }) {
  const [draft, setDraft] = useState(null);
  const press = useRef(null);
  const didHold = useRef(false);
  const restoreFocus = useRef(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  useEffect(() => () => clearTimeout(press.current?.timer), []);

  function cancelPress() {
    clearTimeout(press.current?.timer);
    press.current = null;
  }

  function startPress(event) {
    if (!event.isPrimary || event.button !== 0) return;
    cancelPress();
    didHold.current = false;
    press.current = {
      x: event.clientX,
      y: event.clientY,
      timer: setTimeout(() => {
        cancelPress();
        didHold.current = true;
        setDraft(entry.item);
      }, holdDuration),
    };
  }

  function trackPress(event) {
    const start = press.current;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > movementTolerance) {
      cancelPress();
    }
  }

  function closeEditor() {
    restoreFocus.current = true;
    setDraft(null);
  }

  function saveEdit(event) {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    if (name !== entry.item) onRename(entry.id, name);
    closeEditor();
  }

  return (
    <li
      ref={setNodeRef}
      className="item-row"
      data-bought={entry.bought}
      data-dragging={isDragging}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="row-icon drag-handle"
        disabled={draft !== null}
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${entry.item}`}
      >
        <MdDragIndicator aria-hidden="true" />
      </button>
      {draft === null ? (
        <button
          ref={(node) => {
            if (node && restoreFocus.current) {
              restoreFocus.current = false;
              node.focus();
            }
          }}
          type="button"
          className="item-label"
          aria-pressed={entry.bought}
          aria-keyshortcuts="F2"
          onPointerDown={startPress}
          onPointerMove={trackPress}
          onPointerUp={cancelPress}
          onPointerCancel={cancelPress}
          onPointerLeave={cancelPress}
          onContextMenu={(event) => {
            if (press.current || didHold.current) event.preventDefault();
          }}
          onClick={(event) => {
            if (!didHold.current || event.detail === 0) onToggle(entry.id);
          }}
          onKeyDown={(event) => {
            if (event.key !== "F2") return;
            event.preventDefault();
            setDraft(entry.item);
          }}
        >
          <span className="item-name">{entry.item}</span>
        </button>
      ) : (
        <form
          className="item-edit"
          onSubmit={saveEdit}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeEditor();
            }
          }}
        >
          <input
            aria-label="Edit item name"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoFocus
            required
          />
          <button type="submit" aria-label="Save item name" disabled={!draft.trim()}>
            <MdCheck aria-hidden="true" />
          </button>
          <button type="button" aria-label="Cancel edit" onClick={closeEditor}>
            <MdClose aria-hidden="true" />
          </button>
        </form>
      )}
      <button
        type="button"
        className="row-icon remove-item"
        aria-label={`Remove ${entry.item}`}
        onClick={() => onDelete(entry.id)}
      >
        <MdClose aria-hidden="true" />
      </button>
    </li>
  );
}
