import { useEffect, useState } from "react";
import List from "./Components/List";
import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import Spinner from "./Components/Spinner";

// dnd-kit imports
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

function App() {
  const [shoppingList, setShoppingList] = useState([]);
  const [active, setActive] = useState(1);
  const [input, setInput] = useState('');
  const [loaded, setLoaded] = useState(false);
  
  const bought = shoppingList.reduce((acc, val) => val.bought ? acc + 1 : acc, 0);
  const docRef = doc(db, "shoppingList", "list123");

  // dnd-kit sensors -- PointerSensor for mouse, TouchSensor for mobile
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,    // wait 200ms before drag starts on touch, so taps still work
        tolerance: 5,  // allow 5px movement before cancelling tap
      },
    })
  );

  // Load once on mount - SIMPLE
  useEffect(() => {
    const loadData = async () => {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setShoppingList(snap.data().items || []);
      }
      setLoaded(true);
    };
    loadData();
  }, []);

  // Save to Firebase BUT only when needed - FIXED
  const saveToFirebase = async (newList) => {
    try {
      await setDoc(docRef, { items: newList });
      console.log("Saved to Firebase");
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  // Update handlers - INSTANT UI response
  async function handleAdd(e) {
    e.preventDefault();
    if (!input) return;

    // INSTANT UI UPDATE
    const newList = [...shoppingList, { item: input, bought: false }];
    setShoppingList(newList);
    setInput('');

    // Save to Firebase in BACKGROUND (no await)
    saveToFirebase(newList);
  }

  // REMOVED: handleDragStart and handleDrop -- replaced by handleDragEnd below

  // dnd-kit calls this when drag ends, gives us old and new index
  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = parseInt(active.id);
    const newIndex = parseInt(over.id);

    // arrayMove is a dnd-kit utility -- cleaner than manual splice
    const newList = arrayMove(shoppingList, oldIndex, newIndex);
    setShoppingList(newList);
    saveToFirebase(newList);
  }

  async function handleToggle(ind) {
    // INSTANT UI UPDATE
    const newList = shoppingList.map((item, index) => 
      index === ind ? { ...item, bought: !item.bought } : item
    );
    setShoppingList(newList);

    // Background save
    saveToFirebase(newList);
  }

  async function handleDeleteItem(ind) {
    // INSTANT UI UPDATE
    const newList = shoppingList.filter((_, index) => index !== ind);
    setShoppingList(newList);

    // Background save
    saveToFirebase(newList);
  }

  async function handleDeletePurchased() {
    // INSTANT UI UPDATE
    const newList = shoppingList.filter(item => !item.bought);
    setShoppingList(newList);

    // Background save
    saveToFirebase(newList);
  }

  async function resetData() {
    // INSTANT UI UPDATE
    setShoppingList([]);
    
    // Background save
    saveToFirebase([]);
  }

  return (
    <div className="flex flex-row justify-center items-center bg-[var(--violet)] h-dvh " >
      <div className="border-2 border-hidden rounded-md bg-white p-4 flex flex-col justify-center items-center gap-2 md:w-[60%] lg:w-[50%] xl:w-[40%] w-[80%] ">
        <h5 className="font-bold">My Shopping List</h5>
        <p className="text-gray-400 text-xs">Organize your shopping list here</p>

        <form onSubmit={handleAdd} className="flex flex-col justify-center items-center w-full">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            name="input"
            placeholder="Type here..." 
            className="border-[1.5px] w-[90%] rounded-md px-2 text-xs py-1" 
          />
          <button className="text-white bg-[var(--violet)] hover:bg-[var(--violet-hover)] rounded-md  my-2 text-xs px-3 py-1.5">
            Add To List
          </button>
        </form>

        <div className="flex justify-evenly items-center w-full -translate-x-3">

          <div className="flex flex-col items-center text-xs">
            <p className="font-bold">{bought ? bought : 0}</p>
            <p>Bought</p>
          </div>

          <div className="flex flex-col items-center text-xs">
            <p className="font-bold">{shoppingList ? shoppingList?.length - bought : 0}</p>
            <p>Open</p>
          </div>
          
          <div className="flex flex-col items-center text-xs">
            <p className="font-bold">{shoppingList ? shoppingList?.length : 0}</p>
            <p>All</p>
          </div>

        </div>

        <div className="flex gap-3 mt-3">
          <button 
            className={`${active === 1 ? "active-button" : "passive-button"} text-xs py-1.5 px-2 rounded-md`}
            onClick={() => setActive(1)}
          >
            All Items
          </button>

          <button 
            className={`${active === 2 ? "active-button" : "passive-button"} text-xs py-1.5 px-2 rounded-md`}
            onClick={() => setActive(2)}
          >
            Pending
          </button>

          <button 
            className={`${active === 3 ? "active-button" : "passive-button"} text-xs py-1.5 px-2 rounded-md`}
            onClick={() => setActive(3)}
          >
            Purchased
          </button>

        </div>

        <div className="flex gap-2">
          <button 
            className="text-white bg-red-500 rounded-md my-1 text-[10px] px-2 py-1.5"
            onClick={() => handleDeletePurchased()}
          >
            Clear Purchased
          </button>
          <button 
            className="text-white bg-red-500 rounded-md my-1 text-[10px] px-2 py-1.5"
            onClick={() => resetData([])}
          >
            Clear List
          </button>
        </div>

        { !loaded ? <Spinner /> : 
          shoppingList.length > 0 ? 
            // DndContext wraps everything, SortableContext knows the order
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={shoppingList.map((_, i) => i.toString())}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col items-center w-full gap-2">
                  {shoppingList.map((object,index) => (
                    <List 
                      object={object} 
                      handleToggle={handleToggle} 
                      handleDeleteItem={handleDeleteItem}
                      index={index} 
                      key={index} 
                      active={active}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            : 
            <p className="my-3 text-xs text-gray-400">🥖Your List is empty, add items to start</p>
        }
      </div>

    </div>
  )
}

export default App