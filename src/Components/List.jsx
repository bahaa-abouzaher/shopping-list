// import { FaArrowUp, FaArrowDown } from "react-icons/fa";
import { MdDragIndicator } from "react-icons/md"

function List({object, index, handleDeleteItem, handleToggle, active, onDragStart, onDrop}) {
  const {item, bought} = object;

  if(active === 2 && bought === true ) return;
  if(active === 3 && bought === false) return;

  return (
    <div 
      className={`grid grid-cols-3 items-center w-[75%] border-b border-gray-300 my-1 px-1 text-sm`}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(index)}
    >
      <span 
        onClick={() => handleToggle(index)}
        className={`${bought ? "text-green-300 line-through" : "text-red-500"} cursor-pointer`}
      >
        {item}
      </span>

      <div className="flex justify-center items-center">
        <MdDragIndicator className="cursor-grab text-gray-400 text-lg" />
      </div>

      <button 
        onClick={() => handleDeleteItem(index)} 
        className="flex justify-end items-center text-xs text-red-500 "
      >
        ❌
     
      </button>

    </div>
  )
}

export default List
