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
import { MdAdd, MdOutlineDelete, MdOutlineShoppingBasket } from "react-icons/md";
import List, { DragPreview } from "./Components/List";
import Spinner from "./Components/Spinner";
import { db } from "./firebase";

const shoppingLists = collection(db, "shoppingList");
const docRef = doc(shoppingLists, "list01");
const initialCategories = [
  { id: "arabian-store", label: "Arabian Store" },
  { id: "market", label: "German Market" },
  { id: "others", label: "Others" },
  { id: "Lahham", label: "Lahham" },
];

function detectDrop(args) {
  return args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);
}

function AddForm({ id, label, placeholder, onAdd }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const name = value.trim();
    if (!name) return;

    const message = onAdd(name);
    if (message) {
      setError(message);
      return;
    }

    setValue("");
    event.currentTarget.elements.namedItem("name").focus();
  }

  return (
    <form id={id} onSubmit={handleSubmit} className="add-form">
      <input
        name="name"
        aria-label={label}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError("");
        }}
        autoFocus
        required
      />
      <button type="submit" className="add-button" disabled={!value.trim()}>Add</button>
      {error && <p id={`${id}-error`} className="form-error" role="alert">{error}</p>}
    </form>
  );
}

function CategorySection({
  category, items, isAdding, onShowAdd, onAddItem, onDeleteCategory, onToggle, onDelete,
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `category:${category.id}`,
    data: { category: category.id },
  });

  return (
    <section className="shopping-category" aria-labelledby={`heading-${category.id}`}>
      <div ref={setNodeRef} className="category-target" data-over={isOver}>
        <h2 id={`heading-${category.id}`}>
          <button
            type="button"
            className="category-add"
            aria-label={`Add item to ${category.label}`}
            aria-expanded={isAdding}
            aria-controls={isAdding ? `add-item-${category.id}` : undefined}
            onClick={onShowAdd}
          >
            <span>{category.label}</span>
            <MdAdd aria-hidden="true" />
          </button>
        </h2>
        <button
          type="button"
          className="row-icon remove-item"
          aria-label={`Delete category ${category.label}`}
          onClick={() => onDeleteCategory(category)}
        >
          <MdOutlineDelete aria-hidden="true" />
        </button>
      </div>
      {isAdding && (
        <AddForm
          id={`add-item-${category.id}`}
          label={`Item name for ${category.label}`}
          placeholder="Item name"
          onAdd={(name) => onAddItem(name, category.id)}
        />
      )}
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

async function saveToFirebase(items, categories) {
  try {
    await setDoc(docRef, { items, categories }, { merge: true });
  } catch (error) {
    console.error("Save error:", error);
  }
}

function App() {
  const [shoppingList, setShoppingList] = useState([]);
  const [categories, setCategories] = useState(initialCategories);
  const [addingTo, setAddingTo] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
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
        const { items = [], categories: savedCategories = initialCategories } = snap.data();
        const categories = savedCategories.length || !items.length ? savedCategories : initialCategories;
        const fallback = categories.find(({ id }) => id === "market") ?? categories[0];
        setCategories(categories);
        setShoppingList(items.map((entry) => ({
          ...entry,
          id: entry.id ?? doc(shoppingLists).id,
          category: categories.some(({ id }) => id === entry.category)
            ? entry.category
            : fallback.id,
        })));
      }
      setLoaded(true);
    }
    loadData();
  }, []);

  function updateList(items, nextCategories = categories) {
    setShoppingList(items);
    setCategories(nextCategories);
    saveToFirebase(items, nextCategories);
  }

  function handleAddItem(item, category) {
    updateList([...shoppingList, {
      id: doc(shoppingLists).id,
      item,
      bought: false,
      category,
    }]);
  }

  function handleAddCategory(label) {
    if (categories.some((category) => category.label.toLowerCase() === label.toLowerCase())) {
      return "A category with this name already exists.";
    }

    updateList(shoppingList, [...categories, { id: doc(shoppingLists).id, label }]);
    setShowCategoryForm(false);
  }

  function handleDeleteCategory(category) {
    const count = shoppingList.filter((entry) => entry.category === category.id).length;
    const items = count === 1 ? "1 item" : `${count} items`;
    const message = count
      ? `Delete "${category.label}" and its ${items}? This cannot be undone.`
      : `Delete "${category.label}"? This cannot be undone.`;
    if (!window.confirm(message)) return;

    if (addingTo === category.id) setAddingTo(null);
    updateList(
      shoppingList.filter((entry) => entry.category !== category.id),
      categories.filter(({ id }) => id !== category.id),
    );
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
          <h1 id="list-heading">Shopping List</h1>
        </header>

        {!loaded ? <Spinner /> : (
          <DndContext
            sensors={sensors}
            collisionDetection={detectDrop}
            onDragStart={({ active }) => setDraggedId(active.id)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setDraggedId(null)}
          >
            {!categories.length ? (
              <p className="empty-list">Add a category to start your list.</p>
            ) : (
              <div className="shopping-categories">
                {categories.map((category) => (
                  <CategorySection
                    key={category.id}
                    category={category}
                    items={shoppingList.filter((entry) => entry.category === category.id)}
                    isAdding={addingTo === category.id}
                    onShowAdd={() => {
                      setAddingTo(addingTo === category.id ? null : category.id);
                      setShowCategoryForm(false);
                    }}
                    onAddItem={handleAddItem}
                    onDeleteCategory={handleDeleteCategory}
                    onToggle={handleToggle}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            )}
            <DragOverlay>
              {draggedItem && <DragPreview entry={draggedItem} />}
            </DragOverlay>
          </DndContext>
        )}

        <footer className="list-actions">
          <button
            type="button"
            className="add-category"
            disabled={!loaded}
            aria-expanded={showCategoryForm}
            aria-controls={showCategoryForm ? "add-category-form" : undefined}
            onClick={() => {
              setShowCategoryForm(!showCategoryForm);
              setAddingTo(null);
            }}
          >
            <MdAdd aria-hidden="true" /> Add category
          </button>
          <button type="button" disabled={!hasPurchased} onClick={() => updateList(shoppingList.filter((entry) => !entry.bought))}>
            Clear purchased
          </button>
          <button type="button" disabled={!shoppingList.length} onClick={() => updateList([])}>
            Clear list
          </button>
          {showCategoryForm && (
            <AddForm
              id="add-category-form"
              label="Category name"
              placeholder="Category name"
              onAdd={handleAddCategory}
            />
          )}
        </footer>
      </section>
    </main>
  );
}

export default App;
