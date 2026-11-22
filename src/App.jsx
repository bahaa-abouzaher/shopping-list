import { useEffect, useState } from "react";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { MdAdd, MdOutlineShoppingBasket } from "react-icons/md";
import List, { DragPreview } from "./Components/List";
import Spinner from "./Components/Spinner";
import { db } from "./firebase";

const shoppingLists = collection(db, "shoppingList");
const docRef = doc(shoppingLists, "list123");
const defaultCategory = "arabian-store";
const categories = [
  { id: defaultCategory, label: "Arabian Store" },
  { id: "market", label: "German Market" },
  { id: "others", label: "Others" },
];
function detectDrop(args) {
  return args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);
}

function CategorySection({ category, items, onToggle, onDelete }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `category:${category.id}`,
    data: { category: category.id },
  });

  return (
    <section className="shopping-category" aria-labelledby={`heading-${category.id}`}>
      <div ref={setNodeRef} className="category-target" data-over={isOver}>
        <h2 id={`heading-${category.id}`}>{category.label}</h2>
        {!items.length && <p>Drop an item here</p>}
      </div>
      <SortableContext items={items.map((entry) => entry.id)} strategy={verticalListSortingStrategy}>
        {items.length > 0 && (
          <ul className="shopping-items">
            {items.map((entry) => (
              <List key={entry.id} entry={entry} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </ul>
        )}
      </SortableContext>
    </section>
  );
}

async function saveToFirebase(items) {
  try {
    await setDoc(docRef, { items });
  } catch (error) {
    console.error("Save error:", error);
  }
}

function App() {
  const [shoppingList, setShoppingList] = useState([]);
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [draggedId, setDraggedId] = useState(null);

  const hasPurchased = shoppingList.some((entry) => entry.bought);
  const draggedItem = shoppingList.find((entry) => entry.id === draggedId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    async function loadData() {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const items = snap.data().items || [];
        setShoppingList(items.map((entry) => ({
          ...entry,
          id: entry.id ?? doc(shoppingLists).id,
          category: categories.some(({ id }) => id === entry.category)
            ? entry.category
            : "market",
        })));
      }
      setLoaded(true);
    }
    loadData();
  }, []);

  function updateList(items) {
    setShoppingList(items);
    saveToFirebase(items);
  }

  function handleAdd(event) {
    event.preventDefault();
    const item = input.trim();
    if (!item) return;

    updateList([...shoppingList, {
      id: doc(shoppingLists).id,
      item,
      bought: false,
      category: defaultCategory,
    }]);
    setInput("");
  }

  function handleDragEnd({ active, over }) {
    setDraggedId(null);
    if (!over || active.id === over.id) return;

    const from = shoppingList.findIndex((entry) => entry.id === active.id);
    if (from < 0) return;

    const to = shoppingList.findIndex((entry) => entry.id === over.id);
    const entry = shoppingList[from];
    const category = shoppingList[to]?.category ?? over.data.current?.category;
    if (!category) return;

    if (to >= 0 && entry.category === category) {
      updateList(arrayMove(shoppingList, from, to));
      return;
    }

    if (to < 0 && entry.category === category) return;

    const items = shoppingList.filter((item) => item.id !== entry.id);
    const target = items.findIndex((item) => item.id === over.id);
    items.splice(target < 0 ? items.length : target, 0, { ...entry, category });
    updateList(items);
  }

  function handleToggle(id) {
    updateList(shoppingList.map((entry) =>
      entry.id === id ? { ...entry, bought: !entry.bought } : entry,
    ));
  }

  function handleDeleteItem(id) {
    updateList(shoppingList.filter((entry) => entry.id !== id));
  }

  return (
    <main className="shopping-page">
      <section className="shopping-card" aria-labelledby="list-heading">
        <header className="shopping-header">
          <span className="basket-icon"><MdOutlineShoppingBasket aria-hidden="true" /></span>
          <h1 id="list-heading">My shopping list</h1>
        </header>

        <form onSubmit={handleAdd} className="add-form">
          <input
            aria-label="Item name"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="What do you need?"
            required
          />
          <button type="submit" className="add-button" disabled={!loaded}>
            <MdAdd aria-hidden="true" /> Add item
          </button>
        </form>

        {!loaded ? <Spinner /> : (
          <DndContext
            sensors={sensors}
            collisionDetection={detectDrop}
            onDragStart={({ active }) => setDraggedId(active.id)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setDraggedId(null)}
          >
            {!shoppingList.length && (
              <p className="empty-list">Add an item to start your list.</p>
            )}
            <div className="shopping-categories">
              {categories.map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  items={shoppingList.filter((entry) => entry.category === category.id)}
                  onToggle={handleToggle}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
            <DragOverlay>
              {draggedItem && <DragPreview entry={draggedItem} />}
            </DragOverlay>
          </DndContext>
        )}

        <footer className="list-actions">
          <button type="button" disabled={!hasPurchased} onClick={() => updateList(shoppingList.filter((entry) => !entry.bought))}>
            Clear purchased
          </button>
          <button type="button" disabled={!shoppingList.length} onClick={() => updateList([])}>
            Clear list
          </button>
        </footer>
      </section>
    </main>
  );
}

export default App;
