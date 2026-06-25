import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getTables } from "../services/tableService.js";
import {
  getAllOrders,
  getAllInvoices,
  updateOrderStatus,
  updateInvoiceStatus,
} from "../services/adminService.js";
import api from "../services/api.js";
import BottomNav from "../components/BottomNav.jsx";
import { useAuth } from "../hooks/useAuth.js";
import toast from "react-hot-toast";

const PINK = "#e91e8c";
const PINK_LIGHT = "#fce4f3";
const PINK_DARK = "#c2185b";
const GREEN = "#1D9E75";
const GREEN_LIGHT = "#e6f7ee";
const WHITE = "#fff";

const STATUS_STYLE = {
  Empty:     { bg: WHITE,       border: "rgba(0,0,0,.15)", tc: "#b0aca6", label: "Free" },
  Placed:    { bg: "#dbeeff",   border: "#378ADD",         tc: "#185FA5", label: "Placed" },
  Preparing: { bg: "#fff3e0",   border: "#BA7517",         tc: "#854F0B", label: "Preparing" },
  Ready:     { bg: GREEN_LIGHT, border: GREEN,             tc: "#276749", label: "Ready ✓" },
  Delivered: { bg: "#f0fff4",   border: "#2e7d32",         tc: "#2e7d32", label: "Delivered" },
  Completed: { bg: "#f0f0f0",   border: "#aaa",            tc: "#666",    label: "Completed" },
  Cancelled: { bg: "#ffebeb",   border: "#E24B4A",         tc: "#A32D2D", label: "Cancelled" },
};

const ACTIVE_STATUSES = ["Placed", "Preparing", "Ready", "Delivered"];

// ── inject styles once ────────────────────────────────────────────────────────
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
    @keyframes slideUp {
      from{ opacity:0; transform:translateY(24px); }
      to{ opacity:1; transform:translateY(0); }
    }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes spin { to{ transform:rotate(360deg) } }
    @keyframes slideIn {
      from{ opacity:0; transform:translateX(12px); }
      to{ opacity:1; transform:translateX(0); }
    }
    .wt-root *{ box-sizing:border-box; font-family:'DM Sans',sans-serif; }
    .blink-pending{ animation:blinkBorder 1.4s ease-in-out infinite; }
    .pulse-ready{ animation:pulseGreen 2s ease-in-out infinite; }
    .table-tile{ transition:transform .15s, box-shadow .15s; cursor:pointer; }
    .table-tile:active{ transform:scale(.97); }
    .spinner{
      width:18px; height:18px; border:2.5px solid rgba(0,0,0,.1);
      border-top-color:#555; border-radius:50%;
      animation:spin .7s linear infinite; display:inline-block;
    }
    .modal-overlay{
      position:fixed; inset:0; background:rgba(0,0,0,.52);
      z-index:300; display:flex; align-items:flex-end; justify-content:center;
      animation:fadeIn .18s ease both; backdrop-filter:blur(3px);
    }
    .modal-sheet{
      background:#fff; border-radius:24px 24px 0 0; width:100%;
      max-width:420px; max-height:92vh; overflow-y:auto;
      animation:slideUp .24s cubic-bezier(.4,0,.2,1) both; padding-bottom:40px;
    }
    .printer-modal-overlay{
      position:fixed; inset:0; background:rgba(0,0,0,.6);
      z-index:400; display:flex; align-items:center; justify-content:center;
      animation:fadeIn .15s ease both; backdrop-filter:blur(4px);
      padding: 20px;
    }
    .printer-modal{
      background:#fff; border-radius:20px; width:100%;
      max-width:340px; padding:24px;
      animation:slideUp .2s cubic-bezier(.4,0,.2,1) both;
      box-shadow: 0 20px 60px rgba(0,0,0,.25);
    }
    .printer-option{
      width:100%; padding:16px; border-radius:14px; font-size:14px;
      font-weight:600; cursor:pointer; border:2px solid #f0f0f0;
      background:#fafafa; transition:all .15s; text-align:left;
      display:flex; align-items:center; gap:12px; margin-bottom:10px;
      color:#333;
    }
    .printer-option:hover{ border-color:#e91e8c; background:#fce4f3; color:#e91e8c; }
    .printer-option:active{ transform:scale(.98); }
    .action-btn{
      width:100%; padding:14px; border-radius:14px; font-size:14px;
      font-weight:700; cursor:pointer; border:none; transition:all .15s;
      display:flex; align-items:center; justify-content:center; gap:8px;
    }
    .action-btn:active{ transform:scale(.98); }
    .action-btn:disabled{ opacity:.5; cursor:not-allowed; }
    .tab-btn{
      flex:1; padding:9px 0; border:none; background:none; font-size:13px;
      font-weight:600; cursor:pointer; border-bottom:2.5px solid transparent;
      transition:all .18s; color:#aaa;
    }
    .tab-btn.active{ color:#e91e8c; border-bottom-color:#e91e8c; }
    .hist-row{
      padding:13px 16px; border-bottom:1px solid #f5f5f5;
      animation:slideIn .2s ease both;
    }
    .hist-row:last-child{ border-bottom:none; }
    @media print {
      body > *{ display:none !important; }
      #bill-print-area{ display:block !important; }
    }
    @media (min-width: 600px) {
      .modal-sheet   { max-width: 820px !important; }
      .stats-grid    { gap: 12px !important; }
      .tables-grid   { gap: 16px !important; }
      .table-tile    { padding: 20px 14px !important; }
      .wt-header-pad { padding: 20px 28px !important; }
      .wt-header-title { font-size: 20px !important; }
      .wt-content-pad { padding: 20px 24px 0 !important; }
      .wt-floorplan  { margin: 0 24px 28px !important; padding: 24px 20px !important; }
    }
    @media (min-width: 1024px) {
      .modal-sheet  { max-width: 600px !important; }
      .table-tile   { padding: 24px 16px !important; }
      .wt-floorplan { padding: 28px 24px !important; }
    }
  `;
  document.head.appendChild(s);
}

// ── helpers ───────────────────────────────────────────────────────────────────
function mergeOrderItems(orders) {
  const map = {};
  for (const order of orders) {
    for (const item of order.items || []) {
      const key = item.name;
      if (map[key]) map[key].qty += item.qty;
      else map[key] = { ...item };
    }
  }
  return Object.values(map);
}

function buildMergedBill(orders) {
  const items = mergeOrderItems(orders);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = 0;
  const total = subtotal + tax;
  return { items, subtotal, tax, total };
}

// ── Printer Select Modal ──────────────────────────────────────────────────────
// Shows before printing the bill so the waiter can choose which printer to use.
// printerName values must match the "name" field in DB printerIps exactly.
const BILL_PRINTERS = [
  { name: "Mocktail",    label: "Mocktail Counter",  icon: "🍹", ip: "10.0.0.25" },
  { name: "mocktail_up", label: "Mocktail Upstairs", icon: "🏠", ip: "10.0.0.26" },
];

function PrinterSelectModal({ onSelect, onCancel }) {
  return (
    <div className="printer-modal-overlay" onClick={onCancel}>
      <div className="printer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 4 }}>
            🖨  Select Bill Printer
          </div>
          <div style={{ fontSize: 13, color: "#aaa" }}>
            Which printer should receive this bill?
          </div>
        </div>

        {/* Printer options */}
        {BILL_PRINTERS.map((p) => (
          <button
            key={p.name}
            className="printer-option"
            onClick={() => onSelect(p.name)}
          >
            <span style={{ fontSize: 24 }}>{p.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{p.ip}</div>
            </div>
          </button>
        ))}

        {/* Cancel */}
        <button
          onClick={onCancel}
          style={{
            width: "100%", padding: "12px", borderRadius: 12, fontSize: 13,
            fontWeight: 600, cursor: "pointer", border: "1.5px solid #f0f0f0",
            background: "#fafafa", color: "#aaa", marginTop: 4,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({ tableNo }) {
  const [history, setHistory] = useState([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    setLoadingHist(true);
    api
      .get("admin/orders?limit=200")
      .then((res) => {
        const all = res.data?.orders || [];
        return all.filter(
          (o) =>
            Number(o.tableNo) === Number(tableNo) &&
            ["Completed", "Cancelled"].includes(o.status)
        );
      })
      .then(setHistory)
      .catch(() => toast.error("Could not load history"))
      .finally(() => setLoadingHist(false));
  }, [tableNo]);

  if (loadingHist)
    return (
      <div style={{ textAlign: "center", padding: "36px 0", color: "#ccc" }}>
        <div className="spinner" style={{ margin: "0 auto 10px", borderTopColor: PINK, borderColor: `${PINK}22` }} />
        <div style={{ fontSize: 13 }}>Loading history…</div>
      </div>
    );

  if (!history.length)
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "#ccc" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
        <div style={{ fontSize: 14 }}>No past orders for this table</div>
      </div>
    );

  return (
    <div>
      {history.map((o, idx) => {
        const isOpen = expanded === o._id;
        const ss = STATUS_STYLE[o.status] || STATUS_STYLE.Completed;
        const total = Math.round(o.total || 0);
        const date = new Date(o.createdAt).toLocaleString("en-IN", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
        });
        return (
          <div key={o._id} className="hist-row" style={{ animationDelay: `${idx * 35}ms` }}>
            <div onClick={() => setExpanded(isOpen ? null : o._id)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#333", fontFamily: "'DM Mono',monospace" }}>{o.orderId}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                  {date}{o.user?.name && <span style={{ marginLeft: 6 }}>· {o.user.name}</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: PINK, fontFamily: "'DM Mono',monospace" }}>₹{total.toLocaleString()}</span>
                <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: ss.bg, color: ss.tc, border: `1px solid ${ss.border}` }}>{o.status}</span>
                <span style={{ fontSize: 12, color: "#ccc" }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>
            {isOpen && (
              <div style={{ marginTop: 10, background: "#fafafa", borderRadius: 10, padding: "10px 12px", border: "1px solid #f0f0f0" }}>
                {o.items?.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#555", padding: "4px 0", borderBottom: i < o.items.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                    <span>
                      <span style={{ background: PINK_LIGHT, color: PINK, borderRadius: 6, padding: "1px 7px", fontSize: 11, fontWeight: 700, marginRight: 7 }}>×{item.qty}</span>
                      {item.name}
                    </span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 500 }}>₹{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 13, marginTop: 8, paddingTop: 8, borderTop: "1.5px solid #eee" }}>
                  <span>Total</span>
                  <span style={{ color: PINK, fontFamily: "'DM Mono',monospace" }}>₹{total.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Table Popup ───────────────────────────────────────────────────────────────
function TablePopup({ table, orders, invoice, onClose, onRefresh }) {
  const [tab, setTab] = useState(orders.length > 0 ? "order" : "history");
  const [delivering, setDelivering] = useState(false);
  const [printing, setPrinting] = useState(false);
  // null = hidden, "selecting" = show printer modal, "printing" = sending to printer
  const [printerModal, setPrinterModal] = useState(null);
  const nav = useNavigate();

  const { items: mergedItems, subtotal, tax, total } = buildMergedBill(orders);

  const isPending = invoice?.invoiceStatus?.toLowerCase() === "pending";
  const isFree = orders.length === 0;
  const canDeliver = orders.some((o) => ["Placed", "Preparing", "Ready"].includes(o.status));
  const canBill = orders.length > 0 && orders.every((o) => o.status === "Delivered");

  const STATUS_PRIORITY = ["Placed", "Preparing", "Ready", "Delivered"];
  const dominantStatus =
    orders.length === 0
      ? "Empty"
      : STATUS_PRIORITY.find((st) => orders.some((o) => o.status === st)) || orders[0].status;
  const s = STATUS_STYLE[dominantStatus] || STATUS_STYLE.Empty;

  const goToMenu = () => {
    sessionStorage.setItem("selectedTable", JSON.stringify(table));
    sessionStorage.setItem("cart", JSON.stringify([]));
    nav("/menu");
  };

  const handleDeliverAll = async () => {
    if (!window.confirm("Mark all orders on this table as Delivered?")) return;
    try {
      setDelivering(true);
      const toDeliver = orders.filter((o) => ["Placed", "Preparing", "Ready"].includes(o.status));
      await Promise.all(toDeliver.map((o) => updateOrderStatus(o._id, "Delivered")));
      toast.success(toDeliver.length > 1 ? `${toDeliver.length} orders marked Delivered!` : "Order marked as Delivered!");
      await onRefresh();
      onClose();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setDelivering(false);
    }
  };

  // Step 1: waiter clicks "Print Bill" → show printer selection modal
  const handlePrintBillClick = () => {
    setPrinterModal("selecting");
  };

  // Step 2: waiter picks a printer → generate invoice & send to that printer
  const handlePrinterSelected = async (printerName) => {
    setPrinterModal(null); // close modal
    try {
      setPrinting(true);

      const orderIds = orders.map((o) => o._id);
      const userId = orders[0]?.user?._id || orders[0]?.user || null;

      // Generate invoice
      const invoiceRes = await api.post("invoices/generate", {
        orders: orderIds,
        items: mergedItems,
        userId,
        isGuest: !userId,
        tableNo: table.tableNo,
      });
      const inv = invoiceRes.data;

      // Mark completed — backend emits bill-print with printerName attached
      // We send printerName so the backend can include it in the socket payload
      await updateInvoiceStatus(inv._id, "completed", printerName);

      const printerLabel = BILL_PRINTERS.find(p => p.name === printerName)?.label || printerName;
      toast.success(`Bill sent to ${printerLabel}!`);

      await onRefresh();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to print bill");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <>
      {/* Printer selection modal — rendered above the table popup */}
      {printerModal === "selecting" && (
        <PrinterSelectModal
          onSelect={handlePrinterSelected}
          onCancel={() => setPrinterModal(null)}
        />
      )}

      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          {/* drag handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "#e0e0e0" }} />
          </div>

          {/* Header */}
          <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#111", display: "flex", alignItems: "center", gap: 10 }}>
                Table {table.tableNo}
                <span style={{ fontSize: 12, fontWeight: 400, color: "#aaa" }}>{table.seats} seats</span>
                {orders.length > 1 && (
                  <span style={{ fontSize: 11, fontWeight: 600, background: PINK_LIGHT, color: PINK, borderRadius: 20, padding: "2px 9px", border: `1px solid ${PINK}33` }}>
                    {orders.length} orders
                  </span>
                )}
              </div>
              {orders.length > 0 && (
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 3, fontFamily: "'DM Mono',monospace" }}>
                  {orders.map((o) => o.orderId).join(" · ")}
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid #eee", background: "#fafafa", cursor: "pointer", fontSize: 13, color: "#888", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              <span style={{ padding: "3px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: isFree ? "#f0f0f0" : s.bg, color: isFree ? "#999" : s.tc, border: `1.5px solid ${isFree ? "#ddd" : s.border}` }}>
                {isFree ? "Free" : isPending ? "⚠ Pay due" : s.label}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", margin: "14px 0 0", padding: "0 20px" }}>
            {!isFree && (
              <button className={`tab-btn ${tab === "order" ? "active" : ""}`} onClick={() => setTab("order")}>
                Current Order
              </button>
            )}
          </div>

          {/* Current Order tab */}
          {tab === "order" && !isFree && (
            <div style={{ padding: "0 20px" }}>
              {orders.length > 1 && (
                <div style={{ margin: "16px 0 8px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#bbb", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>Order Breakdown</div>
                  {orders.map((o, oi) => {
                    const ss = STATUS_STYLE[o.status] || STATUS_STYLE.Empty;
                    return (
                      <div key={o._id} style={{ background: "#fafafa", borderRadius: 10, border: "1px solid #f0f0f0", padding: "8px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#444", fontFamily: "'DM Mono',monospace" }}>Order {oi + 1} · {o.orderId}</div>
                          <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{o.items?.length} item{o.items?.length !== 1 ? "s" : ""} · {o.items?.map((i) => i.name).join(", ")}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: PINK, fontFamily: "'DM Mono',monospace" }}>₹{Math.round(o.total).toLocaleString()}</span>
                          <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: ss.bg, color: ss.tc, border: `1px solid ${ss.border}` }}>{o.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ fontSize: 11, fontWeight: 600, color: "#bbb", letterSpacing: 1.2, textTransform: "uppercase", margin: "16px 0 8px" }}>
                {orders.length > 1 ? "All Items (Merged)" : "Order Items"}
              </div>
              <div style={{ background: "#fafafa", borderRadius: 14, border: "1px solid #f0f0f0", overflow: "hidden", marginBottom: 14 }}>
                {mergedItems.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", borderBottom: i < mergedItems.length - 1 ? "1px solid #f5f5f5" : "none", fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: PINK_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: PINK, fontFamily: "'DM Mono',monospace" }}>{item.qty}</div>
                      <span style={{ color: "#333" }}>{item.name}</span>
                    </div>
                    <span style={{ fontWeight: 600, fontFamily: "'DM Mono',monospace", color: "#555" }}>₹{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Bill summary */}
              <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0f0f0", padding: "12px 16px", marginBottom: 18 }}>
                {orders.length > 1 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#aaa", marginBottom: 6, paddingBottom: 8, borderBottom: "1px dashed #f0f0f0" }}>
                    <span>{orders.length} orders combined</span>
                    <span style={{ fontFamily: "'DM Mono',monospace" }}>₹{orders.reduce((s, o) => s + Number(o.total || 0), 0).toLocaleString()}</span>
                  </div>
                )}
                {[
                  { l: "Subtotal", v: `₹${Math.round(subtotal).toLocaleString()}` },
                  { l: "GST (18%)", v: `₹${Math.round(tax).toLocaleString()}` },
                ].map((r) => (
                  <div key={r.l} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#aaa", marginBottom: 6 }}>
                    <span>{r.l}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace" }}>{r.v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700, paddingTop: 10, borderTop: "1.5px solid #f0f0f0", marginTop: 4 }}>
                  <span>Grand Total</span>
                  <span style={{ color: PINK, fontFamily: "'DM Mono',monospace" }}>₹{Math.round(total).toLocaleString()}</span>
                </div>
              </div>

              {/* Action buttons */}
              {orders.some((o) => ACTIVE_STATUSES.includes(o.status)) && (
                <button className="action-btn" onClick={goToMenu} style={{ background: "#f0f4ff", color: "#1a56db", border: "1.5px solid #c7d7f8", marginBottom: 10 }}>
                  ＋ Add More Items
                </button>
              )}

              {canDeliver && (
                <button className="action-btn" onClick={handleDeliverAll} disabled={delivering} style={{ background: GREEN, color: WHITE, marginBottom: 10 }}>
                  {delivering ? (
                    <><span className="spinner" style={{ borderTopColor: WHITE, borderColor: "rgba(255,255,255,.3)" }} />Updating…</>
                  ) : orders.length > 1 ? "🛵  Mark All as Delivered" : "🛵  Mark as Delivered"}
                </button>
              )}

              {/* Print Bill — opens printer selection modal */}
              {canBill && (
                <button className="action-btn" onClick={handlePrintBillClick} disabled={printing} style={{ background: PINK, color: WHITE }}>
                  {printing ? (
                    <><span className="spinner" style={{ borderTopColor: WHITE, borderColor: "rgba(255,255,255,.3)" }} />Sending to printer…</>
                  ) : orders.length > 1 ? "🖨  Print Combined Bill" : "🖨  Print Bill"}
                </button>
              )}

              {!canDeliver && !canBill && (
                <div style={{ textAlign: "center", padding: 14, borderRadius: 12, background: "#f8f8f8", color: "#bbb", fontSize: 13, border: "1px dashed #e0e0e0" }}>
                  ✓ Order completed & settled
                </div>
              )}
            </div>
          )}

          {/* Free table CTA */}
          {isFree && (
            <div style={{ padding: "0 20px" }}>
              <div style={{ margin: "18px 0 6px", background: PINK_LIGHT, borderRadius: 16, padding: "18px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", border: `1.5px solid ${PINK}22` }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: PINK_DARK }}>Table is Free</div>
                  <div style={{ fontSize: 12, color: "#993556", marginTop: 3 }}>Start a new order for this table</div>
                </div>
                <button onClick={goToMenu} style={{ background: PINK, color: WHITE, border: "none", borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer", flexShrink: 0, boxShadow: `0 4px 14px ${PINK}44` }}>
                  + New Order
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, val, color }) => (
  <div style={{ background: WHITE, borderRadius: 12, padding: "12px 14px", border: "1.5px solid rgba(0,0,0,.07)", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
    <div style={{ fontSize: 22, fontWeight: 600, color: color || "#111", fontFamily: "'DM Mono',monospace" }}>{val}</div>
    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2, fontWeight: 500 }}>{label}</div>
  </div>
);

// ── Table Tile ────────────────────────────────────────────────────────────────
const TableTile = ({ table, orders, invoice, onClick }) => {
  const isPending = invoice?.invoiceStatus?.toLowerCase() === "pending";
  const isInactive = table.status === "Inactive";
  const hasOrders = orders.length > 0;

  const STATUS_PRIORITY = ["Placed", "Preparing", "Ready", "Delivered"];
  const dominantStatus = hasOrders
    ? STATUS_PRIORITY.find((st) => orders.some((o) => o.status === st)) || orders[0].status
    : "Empty";

  const s = STATUS_STYLE[dominantStatus] || STATUS_STYLE.Empty;
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  const badgeBg =
    dominantStatus === "Placed" ? "#b9d8f8" :
    dominantStatus === "Preparing" ? "#ffe0a0" :
    dominantStatus === "Ready" ? "#a5d6a7" :
    dominantStatus === "Delivered" ? "#c8f7d6" : "#f0f0f0";

  return (
    <div
      onClick={() => !isInactive && onClick(table)}
      className={`table-tile ${isPending ? "blink-pending" : ""} ${dominantStatus === "Ready" && !isPending ? "pulse-ready" : ""}`}
      style={{ borderRadius: 16, padding: "16px 10px", textAlign: "center", opacity: isInactive ? 0.45 : 1, cursor: isInactive ? "default" : "pointer", position: "relative", background: isPending ? "#fff0f5" : s.bg, border: `2px solid ${isPending ? "#d32f2f" : s.border}` }}
    >
      {orders.length > 1 && (
        <div style={{ position: "absolute", top: 6, right: 6, background: PINK, color: WHITE, borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{orders.length}</div>
      )}
      <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'DM Mono',monospace", color: isPending ? "#c62828" : isInactive ? "#999" : s.tc }}>T{table.tableNo}</div>
      <div style={{ fontSize: 11, color: isPending ? "#e57373" : isInactive ? "#bbb" : s.tc, marginTop: 2 }}>{table.seats} seats</div>
      {hasOrders && (
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, fontFamily: "'DM Mono',monospace", color: isPending ? "#c62828" : PINK }}>
          ₹{Math.round(totalAmount).toLocaleString()}
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: isPending ? "#ffcdd2" : isInactive ? "#eee" : badgeBg, color: isPending ? "#c62828" : isInactive ? "#bbb" : s.tc }}>
          {isPending ? "⚠ Pay due" : isInactive ? "Inactive" : s.label}
        </span>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WaiterTablesPage() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [tables, setTables] = useState([]);
  const [tableOrdersMap, setTableOrdersMap] = useState({});
  const [invoiceMap, setInvoiceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [tablesRes, ordersRes, invoicesRes] = await Promise.all([
        getTables(),
        getAllOrders({ limit: 200 }).catch(() => ({ data: { orders: [] } })),
        getAllInvoices().catch(() => ({ data: { invoices: [] } })),
      ]);

      const dbTables = tablesRes.data?.tables || tablesRes.data || [];
      const orders = ordersRes?.data?.orders || [];
      const invoices = invoicesRes?.data?.invoices || [];

      const oMap = {};
      orders
        .filter((o) => o.orderType === "Dining" && o.tableNo && !["Completed", "Cancelled"].includes(o.status))
        .forEach((o) => {
          const key = Number(o.tableNo);
          if (!oMap[key]) oMap[key] = [];
          oMap[key].push(o);
        });

      for (const key of Object.keys(oMap)) {
        oMap[key].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }

      const iMap = {};
      invoices.forEach((inv) => {
        const invOrderIds = inv.orders?.map(String) || [];
        for (const [tableNo, tableOrders] of Object.entries(oMap)) {
          const matched = tableOrders.some((o) => invOrderIds.includes(String(o._id)));
          if (matched) {
            iMap[Number(tableNo)] = { ...inv, invoiceStatus: inv.status || inv.paymentStatus || "pending" };
            break;
          }
        }
      });

      setTables(dbTables.sort((a, b) => a.tableNo - b.tableNo));
      setTableOrdersMap(oMap);
      setInvoiceMap(iMap);
    } catch {
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const activeTables = tables.filter((t) => t.status !== "Inactive");
  const occupied = activeTables.filter((t) => (tableOrdersMap[t.tableNo] || []).length > 0).length;
  const free = activeTables.length - occupied;
  const pendingCount = Object.values(invoiceMap).filter((i) => i.invoiceStatus?.toLowerCase() === "pending").length;

  if (loading)
    return (
      <div className="wt-root" style={{ textAlign: "center", padding: "100px 20px", color: "#ccc" }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: "0 auto 14px" }} />
        <div style={{ fontSize: 14 }}>Loading floor plan…</div>
      </div>
    );

  return (
    <div className="wt-root" style={{ minHeight: "100vh", background: "#f5f5f5", display: "flex", flexDirection: "column", paddingBottom: 72 }}>
      {/* Header */}
      <div style={{ background: PINK, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: WHITE, fontWeight: 700, fontSize: 18 }}>আড্ডা Waiter</div>
          <div style={{ color: "rgba(255,255,255,.75)", fontSize: 12, marginTop: 2 }}>👋 {user?.waiterName || user?.name || "Waiter"}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {pendingCount > 0 && (
            <span style={{ background: "#ffcdd2", color: "#c62828", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 600 }}>⚠ {pendingCount} pending</span>
          )}
          <button onClick={() => nav("/orders")} style={{ background: "rgba(255,255,255,.2)", border: "none", color: WHITE, borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📋 Orders</button>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
          <StatCard label="Occupied" val={occupied} color={PINK} />
          <StatCard label="Free" val={free} color={GREEN} />
          <StatCard label="Pay pending" val={pendingCount} color={pendingCount > 0 ? "#c62828" : GREEN} />
          <StatCard label="Total" val={tables.length} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span className="pulse-ready" style={{ width: 7, height: 7, borderRadius: "50%", background: GREEN, display: "inline-block" }} />
          <span style={{ fontSize: 12, color: GREEN, fontWeight: 500 }}>Live</span>
          <span style={{ fontSize: 12, color: "#ccc" }}>· updates every 30s</span>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, padding: "8px 12px", background: WHITE, borderRadius: 10, border: "1.5px solid rgba(0,0,0,.07)" }}>
          {[
            { label: "Free",      bg: WHITE,       border: "rgba(0,0,0,.18)" },
            { label: "Placed",    bg: "#dbeeff",   border: "#378ADD" },
            { label: "Preparing", bg: "#fff3e0",   border: "#BA7517" },
            { label: "Ready",     bg: GREEN_LIGHT, border: GREEN },
            { label: "Delivered", bg: "#c8f7d6",   border: "#2e7d32" },
            { label: "Pay due",   bg: "#fff0f5",   border: "#d32f2f", blink: true },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#888" }}>
              <div className={l.blink ? "blink-pending" : ""} style={{ width: 10, height: 10, borderRadius: 3, background: l.bg, border: `1.5px solid ${l.border}` }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Floor plan */}
      <div style={{ margin: "0 16px 24px", background: "#f7f5f1", borderRadius: 18, padding: "20px 16px", border: "1.5px solid rgba(0,0,0,.07)" }}>
        <div style={{ fontSize: 10, color: "#bbb", letterSpacing: 2, textTransform: "uppercase", textAlign: "center", marginBottom: 16 }}>Window side</div>
        {tables.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#ccc" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🪑</div>
            <div style={{ fontSize: 14 }}>No tables configured yet</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {tables.map((t) => (
              <TableTile key={t.tableNo} table={t} orders={tableOrdersMap[t.tableNo] || []} invoice={invoiceMap[t.tableNo] || null} onClick={setSelectedTable} />
            ))}
          </div>
        )}
        <div style={{ fontSize: 10, color: "#bbb", letterSpacing: 2, textTransform: "uppercase", textAlign: "center", marginTop: 20 }}>Counter &amp; Entrance</div>
      </div>

      <BottomNav />

      {selectedTable && (
        <TablePopup
          table={selectedTable}
          orders={tableOrdersMap[selectedTable.tableNo] || []}
          invoice={invoiceMap[selectedTable.tableNo] || null}
          onClose={() => setSelectedTable(null)}
          onRefresh={fetchAll}
        />
      )}
    </div>
  );
}