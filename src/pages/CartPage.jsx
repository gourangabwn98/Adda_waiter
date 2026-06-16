import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { placeOrder } from "../services/orderService.js";
import { useAuth } from "../hooks/useAuth.js";
import { printKOTs } from "../utils/kotPrint.js";
import BottomNav from "../components/BottomNav.jsx";
import toast from "react-hot-toast";

const PINK = "#e91e8c";

function getCart() {
  try {
    return JSON.parse(sessionStorage.getItem("cart") || "[]");
  } catch {
    return [];
  }
}
function saveCart(c) {
  sessionStorage.setItem("cart", JSON.stringify(c));
}

export default function CartPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const table = JSON.parse(sessionStorage.getItem("selectedTable") || "{}");

  const [cart, setCart] = useState(getCart);
  const [loading, setLoading] = useState(false);
  const [orderNote, setOrderNote] = useState("");

  const tableNo = table.tableNo || table.number || table.name || "?";

  /* ── helpers ── */
  const updateQty = (id, delta) => {
    const next = cart
      .map((i) => (i._id === id ? { ...i, qty: i.qty + delta } : i))
      .filter((i) => i.qty > 0);
    setCart(next);
    saveCart(next);
  };

  const updateNotes = (id, notes) => {
    const next = cart.map((i) => (i._id === id ? { ...i, notes } : i));
    setCart(next);
    saveCart(next);
  };

  const removeItem = (id) => {
    const next = cart.filter((i) => i._id !== id);
    setCart(next);
    saveCart(next);
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  /* ── place order ── */
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return toast.error("Cart is empty!");
    if (!table._id && !table.id) return toast.error("No table selected!");

    try {
      setLoading(true);
      const payload = {
  tableId: table._id || table.id,
  tableNo: tableNo,
  items: cart.map((i) => ({
    menuItemId: i._id,   // ✅ FIXED
    name: i.name,
    qty: i.qty,          // ✅ FIXED
    price: i.price,
    notes: i.notes || "",
    category: i.category || "",
  })),
  notes: orderNote,
  waiterName: user?.waiterName || "Waiter",
  totalAmount: subtotal,
};

      const { data } = await placeOrder(payload);
      const orderId = data?.order?._id || data?._id || data?.orderId || "N/A";

      /* Print KOTs */
      // printKOTs({
      //   cart: cart.map((i) => ({ ...i, qty: i.qty })),
      //   tableNo,
      //   orderId,
      //   waiterName: user?.waiterName || "Waiter",
      //   cafeName: "ADDA CAFE",
      // });

      toast.success("Order placed! KOT printing…");
      saveCart([]);
      nav("/orders");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  /* ── empty state ── */
  if (cart.length === 0) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 64 }}>🛒</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: "#333" }}>
          Cart is empty
        </div>
        <div style={{ color: "#888", fontSize: 14 }}>
          Add items from the menu
        </div>
        <button
          onClick={() => nav("/menu")}
          style={{
            marginTop: 8,
            background: PINK,
            color: "#fff",
            border: "none",
            borderRadius: 30,
            padding: "12px 32px",
            fontWeight: 800,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Go to Menu
        </button>
        <BottomNav cartCount={0} />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 160 }}>
      {/* Header */}
      <div
        style={{
          background: "#fff",
          padding: "16px 16px 12px",
          borderBottom: "1px solid #f0f0f0",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ fontSize: 13, color: "#888" }}>
          Table <strong style={{ color: "#333" }}>T{tableNo}</strong>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#222" }}>
          Your Cart · {totalQty} items
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: "12px 16px" }}>
        {cart.map((item) => (
          <div
            key={item._id}
            style={{
              background: "#fafafa",
              borderRadius: 14,
              padding: 14,
              marginBottom: 12,
              border: "1px solid #f0f0f0",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              {/* Name + price */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#222" }}>
                  {item.name}
                </div>
                <div style={{ color: "#888", fontSize: 12 }}>
                  {item.category}
                </div>
                <div style={{ fontWeight: 800, color: PINK, marginTop: 4 }}>
                  ₹{item.price} × {item.qty} ={" "}
                  <span style={{ color: "#333" }}>
                    ₹{item.price * item.qty}
                  </span>
                </div>
              </div>
              {/* Qty control */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => updateQty(item._id, -1)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: `2px solid ${PINK}`,
                    background: "#fff",
                    color: PINK,
                    fontSize: 18,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  −
                </button>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 16,
                    minWidth: 18,
                    textAlign: "center",
                  }}
                >
                  {item.qty}
                </span>
                <button
                  onClick={() => updateQty(item._id, 1)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "none",
                    background: PINK,
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +
                </button>
              </div>
              {/* Remove */}
              <button
                onClick={() => removeItem(item._id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 18,
                  color: "#ccc",
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Notes */}
            <input
              value={item.notes || ""}
              onChange={(e) => updateNotes(item._id, e.target.value)}
              placeholder="Special instructions… (optional)"
              style={{
                marginTop: 10,
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #e0e0e0",
                fontSize: 13,
                background: "#fff",
                outline: "none",
              }}
            />
          </div>
        ))}

        {/* Order-level note */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#333",
              marginBottom: 6,
            }}
          >
            Order Note
          </div>
          <textarea
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            rows={2}
            placeholder="Any note for the kitchen / bar…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e0e0e0",
              fontSize: 13,
              outline: "none",
              resize: "none",
            }}
          />
        </div>
      </div>

      {/* Sticky bottom summary + CTA */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          width: 420,
          background: "#fff",
          borderTop: "1px solid #eee",
          padding: "14px 20px 20px",
          boxShadow: "0 -4px 20px rgba(0,0,0,.08)",
          zIndex: 50,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span style={{ color: "#555", fontSize: 14 }}>Subtotal</span>
          <span style={{ fontWeight: 800, fontSize: 18 }}>₹{subtotal}</span>
        </div>
       <button onClick={handlePlaceOrder} disabled={loading} style={{
    position: "fixed",
    bottom: 70, // 👈 key fix
    width: "100%",
    // maxWidth: 420,
    left: "50%",
    transform: "translateX(-50%)",
    background: loading ? "#ccc" : PINK, color: "#fff",
    borderTop: "1px solid #eee",
    padding: "14px 20px 20px",
    boxShadow: "0 -4px 20px rgba(0,0,0,.08)",
    zIndex: 50,
  }} > {loading ? "Placing…" : "🖨️ Place Order & Print KOT"} </button>
      </div>

      <BottomNav cartCount={totalQty} />
    </div>
  );
}
