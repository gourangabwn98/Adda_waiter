// ─── KOT Categories ───────────────────────────────────────────────────────────
// Adjust these to match your exact category names in the DB
export const MOCKTAIL_CATEGORIES = [
  "Mocktail",
  "Drinks",
  "মকটেল",
  "Cold Coffee",
  "Shake",
  "Tea",
];
export const KITCHEN_CATEGORIES = [
  "Burger",
  "Biryani",
  "Pizza",
  "Wrap",
  "Rice",
  "Snacks",
  "Pasta",
  "Soup",
  "স্ন্যাকস",
  "পিজ্জা",
  "পাস্তা",
  "সুপ",
];

export const isKitchenItem = (item) =>
  !MOCKTAIL_CATEGORIES.includes(item.category);
export const isMocktailItem = (item) =>
  MOCKTAIL_CATEGORIES.includes(item.category);

// ─── KOT builder ─────────────────────────────────────────────────────────────
const buildKOTHtml = ({
  type,
  items,
  tableNo,
  orderId,
  waiterName,
  time,
  cafeName,
}) => `
  <html><head><title>KOT</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 80mm;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      padding: 4mm 4mm 8mm;
      color: #000;
    }
    .center  { text-align: center; }
    .bold    { font-weight: bold; }
    .large   { font-size: 16px; }
    .xlarge  { font-size: 20px; font-weight: bold; }
    .line    { border-top: 1px dashed #000; margin: 4px 0; }
    .line2   { border-top: 2px solid #000; margin: 4px 0; }
    .row     { display: flex; justify-content: space-between; margin: 3px 0; }
    .row .name { flex: 1; }
    .row .qty  { min-width: 30px; text-align: right; font-weight: bold; }
    .kot-type  { font-size: 15px; font-weight: bold; letter-spacing: 1px;
                 border: 2px solid #000; padding: 3px 8px; display: inline-block; margin: 4px 0; }
    .footer    { font-size: 11px; margin-top: 8px; }
    @media print {
      html, body { width: 80mm; margin: 0; padding: 0; }
      @page { size: 80mm auto; margin: 0; }
    }
  </style></head><body>

  <div class="center">
    <div class="xlarge">${cafeName || "ADDA CAFE"}</div>
    <div class="line2"></div>
    <div class="kot-type">--- ${type} KOT ---</div>
  </div>

  <div class="line"></div>
  <div class="row"><span class="bold">Table</span><span class="bold">T${tableNo}</span></div>
  <div class="row"><span>Order ID</span><span>${orderId}</span></div>
  <div class="row"><span>Waiter</span><span>${waiterName}</span></div>
  <div class="row"><span>Time</span><span>${time}</span></div>
  <div class="line2"></div>

  <div class="bold" style="margin-bottom:4px">ITEMS</div>
  ${items
    .map(
      (i) => `
    <div class="row">
      <span class="name">${i.name}</span>
      <span class="qty">x${i.qty}</span>
    </div>
    ${i.notes ? `<div style="font-size:11px;padding-left:8px;color:#555">↳ ${i.notes}</div>` : ""}
  `,
    )
    .join("")}

  <div class="line2"></div>
  <div class="center footer">
    <div>Total Items: ${items.reduce((s, i) => s + i.qty, 0)}</div>
    <div style="margin-top:6px">★ ${type === "KITCHEN" ? "Kitchen Copy" : "Bar / Mocktail Copy"} ★</div>
  </div>

  </body></html>
`;

// ─── Print a single KOT in a new popup window ────────────────────────────────
const printKOT = (htmlContent) => {
  const win = window.open(
    "",
    "_blank",
    "width=320,height=500,scrollbars=no,toolbar=no",
  );
  if (!win) {
    alert("Popup blocked! Please allow popups for this site to print KOT.");
    return;
  }
  win.document.write(htmlContent);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
};

// ─── Main export: split cart and print both KOTs ─────────────────────────────
export const printKOTs = ({ cart, tableNo, orderId, waiterName, cafeName }) => {
  const time = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const kitchenItems = cart.filter(isKitchenItem);
  const mocktailItems = cart.filter(isMocktailItem);

  if (kitchenItems.length > 0) {
    printKOT(
      buildKOTHtml({
        type: "KITCHEN",
        items: kitchenItems,
        tableNo,
        orderId,
        waiterName,
        time,
        cafeName,
      }),
    );
  }

  if (mocktailItems.length > 0) {
    // slight delay so browser opens 2nd popup without blocking
    setTimeout(() => {
      printKOT(
        buildKOTHtml({
          type: "MOCKTAIL / BAR",
          items: mocktailItems,
          tableNo,
          orderId,
          waiterName,
          time,
          cafeName,
        }),
      );
    }, 600);
  }

  return {
    kitchenCount: kitchenItems.length,
    mocktailCount: mocktailItems.length,
  };
};
