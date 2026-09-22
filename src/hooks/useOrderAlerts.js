// ─── hooks/useOrderAlerts.js ──────────────────────────────────────────────
// Audible + visible alert for new customer orders awaiting confirmation.
//
// Reuses the existing real-time architecture, unchanged:
//   - Backend emits "order-request" exactly once per order, and ONLY for
//     customer-placed orders — Admin/Waiter orders take the separate
//     `skipConfirmation` branch and never fire it (see
//     server/controllers/orderController.js placeOrder,
//     ORDER_SOURCES_SKIP_CONFIRMATION). This is what guarantees Admin/
//     Waiter-created orders never alert (case F) — no frontend filtering
//     needed for that part.
//   - "order-status-updated" already fires on accept/decline (acceptOrder/
//     declineOrder in the same file), used here only to keep the pending
//     count accurate, not for alert logic.
//
// Everything below lives at MODULE scope, not inside the React hook itself.
// Reason: BottomNav.jsx (where this is mounted — the one component every
// authenticated page renders) fully unmounts and remounts on every page
// navigation, since React Router swaps the whole route element with no
// shared layout. A plain component-scoped socket/dedup-set gets torn down
// and recreated on every navigation, which risks duplicate listeners and
// loses track of which orders have already alerted. Module-level
// singletons persist for the whole tab session — created once, reused
// across every navigation — and a full page refresh correctly resets them
// (a new page load = a new JS module instance), which is exactly the
// "refresh vs. navigation vs. reconnect" distinction this feature depends
// on:
//   - Full refresh  → module re-initializes → dedup set starts empty →
//     the "connect" catch-up (below) repopulates it SILENTLY, no sound.
//   - SPA navigation → module state untouched → nothing resets.
//   - Socket reconnect (same page, e.g. brief network drop) → module state
//     untouched (dedup set keeps everything already seen) → the "connect"
//     catch-up re-runs but every already-known id is skipped by the dedup
//     guard, so no re-alert for old orders.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { getAllOrders } from "../services/adminService.js";
import chimeUrl from "../assets/ring.mp3";

const SOCKET_URL = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
const STORAGE_KEY = "adda_waiter_orderAlertsEnabled";

let socket = null;
let enabled = localStorage.getItem(STORAGE_KEY) === "1";
// Set once a play (Enable click or a real alert) has resolved without the
// browser blocking it — surfaced only via console, so a real failure is
// visible in devtools instead of silently swallowed like before.
let audioUnlockWarned = false;

// Every order this tab session has ever accounted for (whether via a live
// "order-request" alert or a silent catch-up) — the single dedup guard
// that makes an order alert at most once, ever, no matter how many times
// its event is redelivered or how many times we reconnect/catch up.
const seenOrderIds = new Set();
// Subset of seenOrderIds still awaiting confirmation — purely for the
// visible "N orders need attention" indicator, not used for alert logic.
const pendingOrderIds = new Set();

const listeners = new Set();
const notify = () => listeners.forEach((l) => l());
const getEnabledSnapshot = () => enabled;
const getPendingCountSnapshot = () => pendingOrderIds.size;

// Plain HTMLAudioElement instead of manual Web Audio decode/buffer/suspend
// handling — after several rounds of AudioContext-suspend edge cases still
// not producing sound reliably, this is the simpler, far more standard
// approach for "just play a short notification sound": the browser handles
// fetching/decoding/output itself, with no AudioContext state to babysit.
// A fresh Audio() per play (not one shared/reused element) so overlapping
// alerts (two orders arriving close together) can play concurrently
// instead of one cutting the other off.
function playChime() {
  try {
    const audio = new Audio(chimeUrl);
    audio.volume = 0.9;
    const p = audio.play();
    if (p?.then) {
      p.then(() => { audioUnlockWarned = false; })
        .catch((err) => {
          // Blocked by autoplay policy (before "Enable" has been tapped) or
          // some other playback error — logged once so it's visible in
          // devtools instead of silently vanishing; the toast still shows
          // the alert visually either way.
          if (!audioUnlockWarned) {
            audioUnlockWarned = true;
            console.warn("[order-alert] chime playback failed:", err?.name || err);
          }
        });
    }
  } catch (err) {
    console.warn("[order-alert] chime playback threw:", err);
  }
}

function enableAlertsGlobal() {
  // Runs inside a real click handler — required by browser autoplay policy
  // to unlock audio for the rest of the tab session.
  playChime(); // audible confirmation it's on
  localStorage.setItem(STORAGE_KEY, "1");
  enabled = true;
  notify();
}

// Marks an order known WITHOUT alerting — used for orders discovered via a
// fetch (initial load, refresh, reconnect catch-up) rather than a live
// "order-request" delivery. Idempotent.
function markSeenSilently(id) {
  if (!id || seenOrderIds.has(id)) return;
  seenOrderIds.add(id);
  pendingOrderIds.add(id);
  notify();
}

function markResolved(id) {
  if (id && pendingOrderIds.delete(id)) notify();
}

// The one and only place that actually alerts (toast + sound) — gated by
// the dedup guard, so a redelivered/duplicate event for the same id is a
// guaranteed no-op.
function alertForNewOrder(order) {
  const id = order?._id || order?.orderId;
  if (!id || seenOrderIds.has(id)) return;
  seenOrderIds.add(id);
  pendingOrderIds.add(id);
  notify();

  toast(
    `🔔 New customer order — Table ${order?.tableNo ?? "-"} (${order?.orderId ?? ""})`,
    { icon: "🔔", duration: 6000 },
  );
  if (enabled) playChime();
}

// Orders already PendingConfirmation right now — marked seen silently, no
// sound. Runs on every socket "connect" (fires for the initial connect AND
// every reconnect alike), so both the refresh case and the reconnect case
// go through this same, single code path.
function catchUpPendingOrders() {
  getAllOrders({ status: "PendingConfirmation", limit: 100 })
    .then((res) => {
      const orders = res.data?.orders || [];
      orders.forEach((o) => markSeenSilently(o._id));
    })
    .catch(() => {});
}

// Connects once for the whole tab session — safe to call from every
// BottomNav mount, it's a no-op after the first real call, so remounting
// on navigation can never create a second connection/listener set.
function ensureSocket() {
  if (socket || !SOCKET_URL) return;
  socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });

  socket.on("connect", catchUpPendingOrders);
  socket.on("order-request", alertForNewOrder);
  socket.on("order-status-updated", (order) => {
    if (order?._id && order.status !== "PendingConfirmation") markResolved(order._id);
  });
}

export function useOrderAlerts() {
  useEffect(() => {
    ensureSocket();
    // No cleanup/disconnect on unmount — the socket must survive
    // BottomNav remounting on every page navigation. It lives for the
    // whole tab session.
  }, []);

  const subscribe = useCallback((cb) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }, []);

  const enabledValue = useSyncExternalStore(subscribe, getEnabledSnapshot);
  const pendingCount = useSyncExternalStore(subscribe, getPendingCountSnapshot);

  return { enabled: enabledValue, enableAlerts: enableAlertsGlobal, pendingCount };
}
