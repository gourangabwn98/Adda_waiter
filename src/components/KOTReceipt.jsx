/* KOTReceipt — a hidden printable div used as an alternative
   to the popup-based kotPrint.js. Rendered off-screen,
   then triggered via window.print() with @media print CSS.
   Usage: attach ref, call ref.current.print() */

export default function KOTReceipt({
  type,
  items = [],
  tableNo,
  orderId,
  waiterName,
  cafeName = "ADDA CAFE",
}) {
  const time = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      style={{
        width: 280,
        fontFamily: "'Courier New', monospace",
        fontSize: 13,
        color: "#000",
        padding: "8px 8px 24px",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{cafeName}</div>
        <div style={{ borderTop: "2px solid #000", margin: "4px 0" }} />
        <div
          style={{
            border: "2px solid #000",
            display: "inline-block",
            padding: "2px 10px",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 1,
            margin: "4px 0",
          }}
        >
          — {type} KOT —
        </div>
      </div>

      {/* Meta */}
      <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
      <Row label="Table" value={`T${tableNo}`} />
      <Row label="Order ID" value={orderId} />
      <Row label="Waiter" value={waiterName} />
      <Row label="Time" value={time} />
      <div style={{ borderTop: "2px solid #000", margin: "6px 0" }} />

      {/* Items */}
      <div style={{ fontWeight: 700, marginBottom: 4 }}>ITEMS</div>
      {items.map((item, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ flex: 1 }}>{item.name}</span>
            <span style={{ fontWeight: 700 }}>x{item.qty}</span>
          </div>
          {item.notes && (
            <div style={{ fontSize: 11, paddingLeft: 10, color: "#444" }}>
              ↳ {item.notes}
            </div>
          )}
        </div>
      ))}

      {/* Footer */}
      <div style={{ borderTop: "2px solid #000", margin: "6px 0" }} />
      <div style={{ textAlign: "center", fontSize: 11 }}>
        <div>Total Items: {items.reduce((s, i) => s + i.qty, 0)}</div>
        <div style={{ marginTop: 6 }}>
          ★ {type === "KITCHEN" ? "Kitchen Copy" : "Bar / Mocktail Copy"} ★
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        margin: "2px 0",
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
