import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTables } from "../services/tableService.js";
import { getAllOrders, getAllInvoices } from "../services/adminService.js";
import { useAuth } from "../hooks/useAuth.js";
import toast from "react-hot-toast";

const PINK = "#e91e8c";
const PINK_LIGHT = "#fce4f3";
const PINK_DARK = "#c2185b";
const GREEN = "#1D9E75";
const GREEN_LIGHT = "#e6f7ee";
const WHITE = "#fff";

const STATUS_STYLE = {
  Empty:     { bg: WHITE,      border: "rgba(0,0,0,.15)", tc: "#b0aca6", label: "Free" },
  Placed:    { bg: "#dbeeff",  border: "#378ADD",         tc: "#185FA5", label: "Placed" },
  Preparing: { bg: "#fff3e0",  border: "#BA7517",         tc: "#854F0B", label: "Preparing" },
  Ready:     { bg: GREEN_LIGHT,border: GREEN,             tc: "#276749", label: "Ready ✓" },
  Delivered: { bg: GREEN_LIGHT,border: GREEN,             tc: "#276749", label: "Delivered" },
  Completed: { bg: "#f0f0f0",  border: "#aaa",            tc: "#666",    label: "Completed" },
  Cancelled: { bg: "#ffebeb",  border: "#E24B4A",         tc: "#A32D2D", label: "Cancelled" },
};

const ACTIVE_STATUSES = ["Placed", "Preparing", "Ready", "Delivered"];

if (!document.getElementById("waiter-tables-styles")) {
  const s = document.createElement("style");
  s.id = "waiter-tables-styles";
  s.textContent = `
    @keyframes blinkBorder {
      0%,100%{ box-shadow:0 0 0 0 rgba(211,47,47,0); border-color:#d32f2f; }
      50%{ box-shadow:0 0 0 5px rgba(211,47,47,.22); border-color:#ff1744; }
    }
    @keyframes pulseGreen {
      0%,100%{ box-shadow:0 0 0 0 rgba(29,158,117,0); }
      50%{ box-shadow:0 0 0 5px rgba(29,158,117,.2); }
    }
    @keyframes spin { to{ transform:rotate(360deg) } }
    .wt-root *{ box-sizing:border-box; font-family:'DM Sans',sans-serif; }
    .blink-pending{ animation:blinkBorder 1.4s ease-in-out infinite; }
    .pulse-ready{ animation:pulseGreen 2s ease-in-out infinite; }
    .table-tile{ transition:transform .15s, box-shadow .15s; cursor:pointer; }
    .table-tile:active{ transform:scale(.97); }
    .spinner{ width:18px; height:18px; border:2.5px solid rgba(0,0,0,.1);
      border-top-color:#555; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
  `;
  document.head.appendChild(s);
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, val, color }) => (
  <div style={{
    background: WHITE, borderRadius: 12, padding: "12px 14px",
    border: "1.5px solid rgba(0,0,0,.07)", boxShadow: "0 2px 8px rgba(0,0,0,.04)",
  }}>
    <div style={{ fontSize: 22, fontWeight: 600, color: color || "#111", fontFamily: "'DM Mono',monospace" }}>{val}</div>
    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2, fontWeight: 500 }}>{label}</div>
  </div>
);

// ── Table Tile ────────────────────────────────────────────────────────────────
const TableTile = ({ table, order, invoice, onClick }) => {
  const isPending = invoice?.invoiceStatus?.toLowerCase() === "pending";
  const isInactive = table.status === "Inactive";
  const orderStatus = order ? order.status : "Empty";
  const s = STATUS_STYLE[orderStatus] || STATUS_STYLE.Empty;
  const isReady = orderStatus === "Ready";
  const hasOrder = order && ACTIVE_STATUSES.includes(orderStatus);

  let tileStyle = {
    background: isPending ? "#fff0f5" : s.bg,
    border: `2px solid ${isPending ? "#d32f2f" : s.border}`,
  };

  return (
    <div
      onClick={() => !isInactive && onClick(table)}
      className={`table-tile ${isPending ? "blink-pending" : ""} ${isReady && !isPending ? "pulse-ready" : ""}`}
      style={{
        borderRadius: 16,
        padding: "16px 10px",
        textAlign: "center",
        opacity: isInactive ? 0.45 : 1,
        cursor: isInactive ? "default" : "pointer",
        position: "relative",
        ...tileStyle,
      }}
    >
      {/* table number */}
      <div style={{
        fontSize: 20, fontWeight: 600,
        color: isPending ? "#c62828" : isInactive ? "#999" : s.tc,
        fontFamily: "'DM Mono',monospace",
      }}>
        T{table.tableNo}
      </div>

      {/* seats */}
      <div style={{ fontSize: 11, color: isPending ? "#e57373" : isInactive ? "#bbb" : s.tc, marginTop: 2 }}>
        {table.seats} seats
      </div>

      {/* amount if active order */}
      {hasOrder && (
        <div style={{
          fontSize: 13, fontWeight: 600, marginTop: 6,
          color: isPending ? "#c62828" : PINK,
          fontFamily: "'DM Mono',monospace",
        }}>
          ₹{Math.round(order.total).toLocaleString()}
        </div>
      )}

      {/* status badge */}
      <div style={{ marginTop: 8 }}>
        <span style={{
          display: "inline-block",
          padding: "3px 10px",
          borderRadius: 20,
          fontSize: 10,
          fontWeight: 600,
          background: isPending ? "#ffcdd2" : isInactive ? "#eee" : (
            orderStatus === "Empty" ? "#f0f0f0" :
            orderStatus === "Placed" ? "#b9d8f8" :
            orderStatus === "Preparing" ? "#ffe0a0" :
            orderStatus === "Ready" ? "#a5d6a7" :
            "#e0e0e0"
          ),
          color: isPending ? "#c62828" : isInactive ? "#bbb" : s.tc,
        }}>
          {isPending ? "⚠ Pay due" : isInactive ? "Inactive" : s.label}
        </span>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WaiterTablesPage() {
  const nav = useNavigate();
  const { user, logout } = useAuth();

  const [tables, setTables] = useState([]);
  const [tableMap, setTableMap] = useState({});   // tableNo → active order
  const [invoiceMap, setInvoiceMap] = useState({}); // tableNo → invoice
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tablesRes, ordersRes, invoicesRes] = await Promise.all([
          getTables(),
          getAllOrders({ limit: 100 }).catch(() => ({ data: { orders: [] } })),
          getAllInvoices().catch(() => ({ data: { invoices: [] } })),
        ]);

        const dbTables = tablesRes.data?.tables || tablesRes.data || [];
        const orders = ordersRes?.data?.orders || [];
        const invoices = invoicesRes?.data?.invoices || [];

        // build order map: tableNo → latest active dining order
        const oMap = {};
        orders
          .filter(o =>
            o.orderType === "Dining" &&
            o.tableNo &&
            !["Completed", "Cancelled"].includes(o.status)
          )
          .forEach(o => { oMap[Number(o.tableNo)] = o; });

        // build invoice map
        const iMap = {};
        invoices.forEach(inv => {
          const orderIds = inv.orders?.map(String) || [];
          for (const [tableNo, order] of Object.entries(oMap)) {
            if (orderIds.includes(String(order._id))) {
              iMap[Number(tableNo)] = {
                ...inv,
                invoiceStatus: inv.status || inv.paymentStatus || "pending",
              };
              break;
            }
          }
        });

        setTables(dbTables.sort((a, b) => a.tableNo - b.tableNo));
        setTableMap(oMap);
        setInvoiceMap(iMap);
      } catch {
        toast.error("Failed to load tables");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    const iv = setInterval(fetchAll, 30000); // live refresh every 30s
    return () => clearInterval(iv);
  }, []);

  const handleSelect = (table) => {
    sessionStorage.setItem("selectedTable", JSON.stringify(table));
    sessionStorage.setItem("cart", JSON.stringify([]));
    nav("/menu");
  };

  // stats
  const activeTables = tables.filter(t => t.status !== "Inactive");
  const occupied = activeTables.filter(t => tableMap[t.tableNo]).length;
  const free = activeTables.length - occupied;
  const pendingCount = Object.values(invoiceMap).filter(
    i => i.invoiceStatus?.toLowerCase() === "pending"
  ).length;

  if (loading) return (
    <div className="wt-root" style={{ textAlign: "center", padding: "100px 20px", color: "#ccc" }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: "0 auto 14px" }} />
      <div style={{ fontSize: 14 }}>Loading floor plan…</div>
    </div>
  );

  return (
    <div className="wt-root" style={{ minHeight: "100vh", background: "#f5f5f5", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <div style={{
        background: PINK, padding: "16px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ color: WHITE, fontWeight: 700, fontSize: 18 }}>আড্ডা Waiter</div>
          <div style={{ color: "rgba(255,255,255,.75)", fontSize: 12, marginTop: 2 }}>
            👋 {user?.waiterName || user?.name || "Waiter"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {pendingCount > 0 && (
            <span style={{
              background: "#ffcdd2", color: "#c62828", borderRadius: 20,
              padding: "4px 10px", fontSize: 11, fontWeight: 600,
            }}>
              ⚠ {pendingCount} pending
            </span>
          )}
          <button
            onClick={() => nav("/orders")}
            style={{
              background: "rgba(255,255,255,.2)", border: "none", color: WHITE,
              borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}
          >
            📋 Orders
          </button>
          <button
            onClick={() => { logout(); nav("/"); }}
            style={{
              background: "rgba(255,255,255,.15)", border: "none", color: WHITE,
              borderRadius: 20, padding: "6px 12px", cursor: "pointer", fontSize: 12,
            }}
          >
            Exit
          </button>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>

        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
          <StatCard label="Occupied" val={occupied} color={PINK} />
          <StatCard label="Free" val={free} color={GREEN} />
          <StatCard label="Pay pending" val={pendingCount} color={pendingCount > 0 ? "#c62828" : GREEN} />
          <StatCard label="Total tables" val={tables.length} />
        </div>

        {/* ── Live indicator ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", background: GREEN, display: "inline-block",
          }} className="pulse-ready" />
          <span style={{ fontSize: 12, color: GREEN, fontWeight: 500 }}>Live</span>
          <span style={{ fontSize: 12, color: "#ccc" }}>· updates every 30s</span>
        </div>

        {/* ── Legend ── */}
        <div style={{
          display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12,
          padding: "8px 12px", background: WHITE, borderRadius: 10,
          border: "1.5px solid rgba(0,0,0,.07)",
        }}>
          {[
            { label: "Free",      bg: WHITE,       border: "rgba(0,0,0,.18)" },
            { label: "Placed",    bg: "#dbeeff",   border: "#378ADD" },
            { label: "Preparing", bg: "#fff3e0",   border: "#BA7517" },
            { label: "Ready",     bg: GREEN_LIGHT, border: GREEN },
            { label: "Pay due",   bg: "#fff0f5",   border: "#d32f2f", blink: true },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#888" }}>
              <div className={l.blink ? "blink-pending" : ""} style={{
                width: 10, height: 10, borderRadius: 3,
                background: l.bg, border: `1.5px solid ${l.border}`,
              }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Floor plan ── */}
      <div style={{ margin: "0 16px 24px", background: "#f7f5f1", borderRadius: 18, padding: "20px 16px", border: "1.5px solid rgba(0,0,0,.07)" }}>
        <div style={{ fontSize: 10, color: "#bbb", letterSpacing: 2, textTransform: "uppercase", textAlign: "center", marginBottom: 16 }}>
          Window side
        </div>

        {tables.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#ccc" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🪑</div>
            <div style={{ fontSize: 14 }}>No tables configured yet</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {tables.map(t => (
              <TableTile
                key={t.tableNo}
                table={t}
                order={tableMap[t.tableNo] || null}
                invoice={invoiceMap[t.tableNo] || null}
                onClick={handleSelect}
              />
            ))}
          </div>
        )}

        <div style={{ fontSize: 10, color: "#bbb", letterSpacing: 2, textTransform: "uppercase", textAlign: "center", marginTop: 20 }}>
          Counter &amp; Entrance
        </div>
      </div>
    </div>
  );
}