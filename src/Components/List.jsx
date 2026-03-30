import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MdDragIndicator } from "react-icons/md";

function List({ object, index, handleDeleteItem, handleToggle, active }) {
  const { item, bought } = object;

  // dnd-kit hook — gives us drag props and transform style for this item
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: index.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1, // fade the item while dragging
  };

  if (active === 2 && bought === true) return null;
  if (active === 3 && bought === false) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-3 items-center w-[75%] border-b border-gray-300 my-1 px-1 text-sm"
    >
      <span
        onClick={() => handleToggle(index)}
        className={`${bought ? "text-green-300 line-through" : "text-red-500"} cursor-pointer`}
      >
        {item}
      </span>

      {/* drag handle — listeners and attributes only on the handle, not the whole row */}
      <div className="flex justify-center items-center">
        <MdDragIndicator
          className="cursor-grab text-gray-400 text-lg"
          {...listeners}
          {...attributes}
        />
      </div>

      <button
        onClick={() => handleDeleteItem(index)}
        className="flex justify-end items-center text-xs text-red-500"
      >
        ❌
      </button>
    </div>
  );
}

export default List;