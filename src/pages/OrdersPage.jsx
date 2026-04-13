import { useEffect, useState } from "react";
import { getMyOrders } from "../services/orderService.js";
import { printKOTs } from "../utils/kotPrint.js";
import { useAuth } from "../hooks/useAuth.js";
import BottomNav from "../components/BottomNav.jsx";
import toast from "react-hot-toast";

const PINK = "#e91e8c";

// matched exactly to schema enum values (lowercased for lookup)
const STATUS_STYLE = {
  placed: { bg: "#fff8e1", color: "#f57f17", label: "⏳ Placed" },
  preparing: { bg: "#f3e5f5", color: "#6a1b9a", label: "🍳 Preparing" },
  ready: { bg: "#e8f5e9", color: "#2e7d32", label: "🔔 Ready" },
  delivered: { bg: "#e0f7fa", color: "#00695c", label: "🍽️ Delivered" },
  completed: { bg: "#e8f5e9", color: "#1b5e20", label: "✅ Completed" },
  cancelled: { bg: "#fce4ec", color: "#c62828", label: "❌ Cancelled" },
};

const PAYMENT_STYLE = {
  pending: { bg: "#fff8e1", color: "#f57f17" },
  paid: { bg: "#e8f5e9", color: "#2e7d32" },
  failed: { bg: "#fce4ec", color: "#c62828" },
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = () => {
    setLoading(true);
    getMyOrders()
      .then((r) => {
        const raw = r.data?.orders || r.data || [];
        setOrders(
          [...raw].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
          ),
        );
      })
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleReprint = (order) => {
    // schema uses `qty` not `quantity`
    const cart = (order.items || []).map((i) => ({
      _id: i.menuItem?._id || i.menuItem || i._id,
      name: i.name,
      qty: i.qty,
      price: i.price,
      notes: i.notes || "",
      category: i.category || "",
    }));
    printKOTs({
      cart,
      tableNo: order.tableNo,
      orderId: order.orderId || order._id?.slice(-6).toUpperCase() || "N/A",
      waiterName: user?.waiterName || "Waiter",
      cafeName: "ADDA CAFE",
    });
    toast.success("Re-printing KOT…");
  };

  const fmt = (iso) =>
    new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });

  const totalRevenue = orders
    .filter((o) => o.paymentStatus?.toLowerCase() === "paid")
    .reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div
      style={{ paddingBottom: 90, background: "#f7f7f7", minHeight: "100vh" }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "#fff",
          padding: "16px 16px 12px",
          borderBottom: "1px solid #f0f0f0",
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#222" }}>
            Today's Orders
          </div>
          <div style={{ fontSize: 13, color: "#888" }}>
            {orders.length} orders · ₹{totalRevenue.toFixed(0)} collected
          </div>
        </div>
        <button
          onClick={load}
          style={{
            background: "#f5f5f5",
            border: "none",
            borderRadius: 12,
            padding: "8px 14px",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            color: "#555",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* ── List ── */}
      <div style={{ padding: "12px 16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>
            Loading…
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>
            <div style={{ fontSize: 48 }}>📋</div>
            <div style={{ marginTop: 12, fontWeight: 600 }}>No orders yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Place an order from the menu
            </div>
          </div>
        ) : (
          orders.map((order) => {
            const statusKey = (order.status || "placed").toLowerCase();
            const st = STATUS_STYLE[statusKey] || STATUS_STYLE.placed;
            const payKey = (order.paymentStatus || "pending").toLowerCase();
            const pay = PAYMENT_STYLE[payKey] || PAYMENT_STYLE.pending;
            const isOpen = expanded === order._id;

            // schema uses `qty` — sum correctly
            const itemCount = (order.items || []).reduce(
              (s, i) => s + (i.qty || 0),
              0,
            );

            return (
              <div
                key={order._id}
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  marginBottom: 12,
                  border: "1px solid #f0f0f0",
                  boxShadow: "0 2px 8px rgba(0,0,0,.05)",
                  overflow: "hidden",
                }}
              >
                {/* Summary row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : order._id)}
                  style={{ padding: "14px 16px", cursor: "pointer" }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontWeight: 800, fontSize: 16 }}>
                          {order.tableNo
                            ? `Table T${order.tableNo}`
                            : order.orderType}
                        </span>
                        <span
                          style={{
                            background: st.bg,
                            color: st.color,
                            borderRadius: 30,
                            padding: "2px 10px",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {st.label}
                        </span>
                        <span
                          style={{
                            background: pay.bg,
                            color: pay.color,
                            borderRadius: 30,
                            padding: "2px 10px",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {order.paymentStatus || "Pending"}
                        </span>
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#888", marginTop: 4 }}
                      >
                        {order.orderId || order._id?.slice(-6).toUpperCase()}
                        {" · "}
                        {fmtDate(order.createdAt)}
                        {" · "}
                        {fmt(order.createdAt)}
                        {" · "}
                        {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>
                        ₹{order.total ?? order.subtotal ?? 0}
                      </div>
                      <div
                        style={{ fontSize: 14, color: "#ccc", marginTop: 2 }}
                      >
                        {isOpen ? "▲" : "▼"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div
                    style={{
                      borderTop: "1px solid #f5f5f5",
                      padding: "12px 16px 16px",
                    }}
                  >
                    {/* Items — uses qty from schema */}
                    {(order.items || []).map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          padding: "8px 0",
                          borderBottom: "1px dashed #f0f0f0",
                          fontSize: 14,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                          <span style={{ color: "#aaa", marginLeft: 6 }}>
                            ×{item.qty}
                          </span>
                          <div style={{ fontSize: 12, color: "#aaa" }}>
                            ₹{item.price} each
                          </div>
                          {item.notes && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#888",
                                marginTop: 2,
                              }}
                            >
                              ↳ {item.notes}
                            </div>
                          )}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>
                          ₹{(item.price * item.qty).toFixed(0)}
                        </span>
                      </div>
                    ))}

                    {/* Bill breakdown */}
                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 12px",
                        background: "#fafafa",
                        borderRadius: 10,
                        fontSize: 13,
                      }}
                    >
                      <BillRow
                        label="Subtotal"
                        value={`₹${order.subtotal ?? 0}`}
                      />
                      {order.tax > 0 && (
                        <BillRow label="Tax" value={`₹${order.tax}`} muted />
                      )}
                      {order.discount > 0 && (
                        <BillRow
                          label="Discount"
                          value={`−₹${order.discount}`}
                          muted
                        />
                      )}
                      <div
                        style={{
                          borderTop: "1px solid #e0e0e0",
                          marginTop: 6,
                          paddingTop: 6,
                          display: "flex",
                          justifyContent: "space-between",
                          fontWeight: 800,
                          fontSize: 15,
                        }}
                      >
                        <span>Total</span>
                        <span style={{ color: PINK }}>₹{order.total ?? 0}</span>
                      </div>
                    </div>

                    {order.notes && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          color: "#888",
                          fontStyle: "italic",
                        }}
                      >
                        Note: {order.notes}
                      </div>
                    )}

                    <button
                      onClick={() => handleReprint(order)}
                      style={{
                        marginTop: 14,
                        width: "100%",
                        padding: "11px",
                        borderRadius: 10,
                        border: `2px solid ${PINK}`,
                        background: "#fff",
                        color: PINK,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      🖨️ Re-print KOT
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function BillRow({ label, value, muted }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 4,
        color: muted ? "#aaa" : "#555",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
