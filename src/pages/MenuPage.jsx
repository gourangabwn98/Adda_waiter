import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getMenu, getCategories } from "../services/menuService.js";
import toast from "react-hot-toast";

const PINK = "#e91e8c";
const WHITE = "#fff";
const GREEN = "#1D9E75";

// Mocktail / bar categories — keep in sync with kotPrint.js
const MOCKTAIL_CATS = [
  "Mocktail",
  "Drinks",
  "মকটেল",
  "Cold Coffee",
  "Shake",
  "Tea",
  "কোল্ডকফি",
  "শেক্",
  "টি",
  "হট কফি",
];

const catColor = (cat) =>
  MOCKTAIL_CATS.includes(cat)
    ? { bg: "#E6F1FB", color: "#185FA5", icon: "🥤" }
    : { bg: "#EAF3DE", color: "#3B6D11", icon: "🍽️" };

const isUrl = (s) => typeof s === "string" && s.startsWith("http");

export default function MenuPage() {
  const nav = useNavigate();
  const table = JSON.parse(sessionStorage.getItem("selectedTable") || "{}");
  const [cart, setCart] = useState(() =>
    JSON.parse(sessionStorage.getItem("cart") || "[]"),
  );
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [selCat, setSelCat] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [vegOnly, setVegOnly] = useState(false);
  const [noteModal, setNoteModal] = useState(null); // item for note input

  useEffect(() => {
    if (!table?.tableNo) {
      nav("/tables");
      return;
    }
    Promise.all([getMenu({}), getCategories()])
      .then(([m, c]) => {
        setItems(m.data || []);
        const catList = c.data?.data || c.data || [];
        const names = catList.map((x) => (typeof x === "string" ? x : x.name));
        setCats(["All", ...names]);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load menu");
        setLoading(false);
      });
  }, []);

  // Persist cart to sessionStorage on every change
  useEffect(() => {
    sessionStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const getQty = (id) => cart.find((c) => c._id === id)?.qty || 0;

  const addItem = useCallback((item) => {
    setCart((prev) => {
      const ex = prev.find((c) => c._id === item._id);
      return ex
        ? prev.map((c) => (c._id === item._id ? { ...c, qty: c.qty + 1 } : c))
        : [...prev, { ...item, qty: 1, notes: "" }];
    });
  }, []);

  const removeItem = useCallback((id) => {
    setCart((prev) => {
      const ex = prev.find((c) => c._id === id);
      if (!ex) return prev;
      return ex.qty === 1
        ? prev.filter((c) => c._id !== id)
        : prev.map((c) => (c._id === id ? { ...c, qty: c.qty - 1 } : c));
    });
  }, []);

  const saveNote = (id, note) => {
    setCart((prev) =>
      prev.map((c) => (c._id === id ? { ...c, notes: note } : c)),
    );
    setNoteModal(null);
  };

  const filtered = items.filter(
    (i) =>
      (selCat === "All" || i.category === selCat) &&
      i.name?.toLowerCase().includes(search.toLowerCase()) &&
      (!vegOnly || i.tag === "Veg"),
  );

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const totalAmt = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // group filtered items: kitchen first, then mocktail
  const kitchenItems = filtered.filter(
    (i) => !MOCKTAIL_CATS.includes(i.category),
  );
  const mocktailItems = filtered.filter((i) =>
    MOCKTAIL_CATS.includes(i.category),
  );

  const renderItem = (item) => {
    const qty = getQty(item._id);
    const cc = catColor(item.category);
    const cartItem = cart.find((c) => c._id === item._id);
    return (
      <div
        key={item._id}
        style={{
          display: "flex",
          gap: 12,
          padding: "12px 0",
          borderBottom: "1px solid #f5f5f5",
          alignItems: "center",
        }}
      >
        {/* image */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 12,
            flexShrink: 0,
            overflow: "hidden",
            background: "#f5f5f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isUrl(item.image) ? (
            <img
              src={item.image}
              alt={item.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : (
            <span style={{ fontSize: 28 }}>{item.image || cc.icon}</span>
          )}
        </div>

        {/* info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#222" }}>
            {item.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#aaa",
              marginTop: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.description}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginTop: 5,
            }}
          >
            <span style={{ fontWeight: 700, color: PINK, fontSize: 14 }}>
              ₹{item.price}
            </span>
            {item.originalPrice && (
              <span
                style={{
                  textDecoration: "line-through",
                  color: "#aaa",
                  fontSize: 11,
                }}
              >
                ₹{item.originalPrice}
              </span>
            )}
            <span
              style={{
                background: cc.bg,
                color: cc.color,
                fontSize: 9,
                padding: "2px 7px",
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              {item.tag}
            </span>
          </div>
          {/* note if added */}
          {cartItem?.notes && (
            <div style={{ fontSize: 10, color: "#e91e8c", marginTop: 3 }}>
              📝 {cartItem.notes}
            </div>
          )}
        </div>

        {/* qty controls */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          {qty === 0 ? (
            <button
              onClick={() => addItem(item)}
              style={{
                padding: "7px 18px",
                borderRadius: 20,
                background: PINK,
                color: WHITE,
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Add
            </button>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => removeItem(item._id)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: `2px solid ${PINK}`,
                    background: WHITE,
                    color: PINK,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  −
                </button>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    minWidth: 20,
                    textAlign: "center",
                  }}
                >
                  {qty}
                </span>
                <button
                  onClick={() => addItem(item)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "none",
                    background: PINK,
                    color: WHITE,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  +
                </button>
              </div>
              <button
                onClick={() => setNoteModal(item)}
                style={{
                  fontSize: 10,
                  color: "#aaa",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                {cartItem?.notes ? "Edit note" : "+ Add note"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const SectionHead = ({ label, color, bg }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "16px 0 8px",
        padding: "8px 12px",
        background: bg,
        borderRadius: 10,
      }}
    >
      <span style={{ fontSize: 18 }}>{color === "#185FA5" ? "🥤" : "🍽️"}</span>
      <span style={{ fontWeight: 700, fontSize: 14, color }}>{label}</span>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#f9f9f9",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: PINK,
          padding: "14px 16px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ color: WHITE, fontWeight: 800, fontSize: 16 }}>
              Table {table.tableNo} — {table.seats} seats
            </div>
            <div
              style={{
                color: "rgba(255,255,255,.75)",
                fontSize: 11,
                marginTop: 2,
              }}
            >
              Select items to order
            </div>
          </div>
          <button
            onClick={() => nav("/tables")}
            style={{
              background: "rgba(255,255,255,.2)",
              border: "none",
              color: WHITE,
              borderRadius: 20,
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            ← Tables
          </button>
        </div>

        {/* search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search food or drink…"
          style={{
            width: "100%",
            marginTop: 10,
            padding: "9px 14px",
            borderRadius: 20,
            border: "none",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Filters row */}
      <div
        style={{
          background: WHITE,
          borderBottom: "1px solid #eee",
          padding: "10px 12px",
          display: "flex",
          gap: 8,
          alignItems: "center",
          overflowX: "auto",
          position: "sticky",
          top: 100,
          zIndex: 9,
        }}
      >
        {/* veg toggle */}
        <div
          onClick={() => setVegOnly((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: 20,
            border: `1.5px solid ${vegOnly ? GREEN : "#ddd"}`,
            background: vegOnly ? "#EAF3DE" : WHITE,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: vegOnly ? GREEN : "#ddd",
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: vegOnly ? GREEN : "#aaa",
            }}
          >
            Veg only
          </span>
        </div>
        {/* categories */}
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setSelCat(c)}
            style={{
              whiteSpace: "nowrap",
              padding: "5px 14px",
              borderRadius: 20,
              flexShrink: 0,
              border: `1.5px solid ${selCat === c ? PINK : "#eee"}`,
              background: selCat === c ? PINK : WHITE,
              color: selCat === c ? WHITE : "#666",
              fontSize: 12,
              fontWeight: selCat === c ? 700 : 400,
              cursor: "pointer",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Menu items */}
      <div style={{ flex: 1, padding: "0 16px 100px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#aaa" }}>
            Loading menu…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px", color: "#bbb" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div>No items found</div>
          </div>
        ) : (
          <>
            {kitchenItems.length > 0 && (
              <>
                <SectionHead
                  label="Kitchen Items"
                  color="#3B6D11"
                  bg="#EAF3DE"
                />
                {kitchenItems.map(renderItem)}
              </>
            )}
            {mocktailItems.length > 0 && (
              <>
                <SectionHead
                  label="Mocktails & Drinks"
                  color="#185FA5"
                  bg="#E6F1FB"
                />
                {mocktailItems.map(renderItem)}
              </>
            )}
          </>
        )}
      </div>

      {/* Cart bar */}
      {totalItems > 0 && (
        <div
          onClick={() => nav("/cart")}
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 420,
            background: PINK,
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            boxShadow: `0 -4px 20px ${PINK}55`,
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                background: "rgba(255,255,255,.3)",
                borderRadius: "50%",
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: WHITE,
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              {totalItems}
            </div>
            <span style={{ color: WHITE, fontWeight: 600 }}>
              {totalItems} item{totalItems > 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ color: WHITE, fontWeight: 700, fontSize: 16 }}>
              ₹{totalAmt}
            </span>
            <span style={{ color: WHITE, fontWeight: 800 }}>View Cart →</span>
          </div>
        </div>
      )}

      {/* Note modal */}
      {noteModal && (
        <NoteModal
          item={noteModal}
          existing={cart.find((c) => c._id === noteModal._id)?.notes || ""}
          onSave={saveNote}
          onClose={() => setNoteModal(null)}
        />
      )}
    </div>
  );
}

// ── Note modal ────────────────────────────────────────────────────────────────
function NoteModal({ item, existing, onSave, onClose }) {
  const [note, setNote] = useState(existing);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px 20px 0 0",
          padding: 24,
          width: "100%",
          maxWidth: 420,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          {item.name}
        </div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 14 }}>
          Add a note for the kitchen
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Extra spicy, No onion, Less sugar…"
          rows={3}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1.5px solid #ddd",
            fontSize: 13,
            outline: "none",
            resize: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: 25,
              border: "1.5px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(item._id, note)}
            style={{
              flex: 2,
              padding: "11px",
              borderRadius: 25,
              border: "none",
              background: "#e91e8c",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
