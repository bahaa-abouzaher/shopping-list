import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MdClose, MdDragIndicator } from "react-icons/md";

export function DragPreview({ entry }) {
  return (
    <div className="item-row drag-preview" data-bought={entry.bought} aria-hidden="true">
      <span className="row-icon drag-handle"><MdDragIndicator /></span>
      <span className="item-label"><span className="item-name">{entry.item}</span></span>
      <span className="row-icon"><MdClose /></span>
    </div>
  );
}

export default function List({ entry, onToggle, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

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
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${entry.item}`}
      >
        <MdDragIndicator aria-hidden="true" />
      </button>
      <button
        type="button"
        className="item-label"
        aria-pressed={entry.bought}
        onClick={() => onToggle(entry.id)}
      >
        <span className="item-name">{entry.item}</span>
      </button>
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
