// ─── hooks/useOrderAlerts.js ──────────────────────────────────────────────
// Audible + visible alert for new customer orders awaiting confirmation.
//
// Reuses the existing real-time architecture, unchanged:
//   - Backend emits "order-request" exactly once per order, and ONLY for
//     customer-placed orders — Admin/Waiter orders take the separate
//     `skipConfirmation` branch and never fire it (see
//     server/controllers/orderController.js placeOrder,
//     ORDER_SOURCES_SKIP_CONFIRMATION). This is what guarantees Admin/
//     Waiter-created orders never alert — no frontend filtering needed for
//     that part.
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

const SOCKET_URL = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
const STORAGE_KEY = "adda_waiter_orderAlertsEnabled";

let socket = null;
let enabled = localStorage.getItem(STORAGE_KEY) === "1";

// ── Audio: pure Web Audio API (oscillator + gain), no mp3/audio file, no
// network/decode dependency at all — nothing that can 404, fail to decode,
// or otherwise be "broken." One persistent AudioContext for the whole tab
// session — never recreated per play or per navigation, which is what made
// earlier attempts play once and then go silent (a freshly-created context
// starts "suspended" again under browser autoplay policy).
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// Surfaced to the Waiter (not just devtools) if sound genuinely can't play
// — throttled to once per "blocked" streak, reset the next time a play
// actually succeeds, so it doesn't spam a toast per order.
let audioBlockedWarned = false;
function warnAudioBlocked() {
  if (audioBlockedWarned) return;
  audioBlockedWarned = true;
  toast.error("🔇 Sound is blocked — tap \"Enable Order Alerts\" again.", { duration: 8000 });
}

// A bright ascending three-note bell chime (G5 → B5 → E6) — clearly
// audible/noticeable like a doorbell/notification "ding-ding-ding!",
// rather than a flat/harsh triple beep.
const CHIME_NOTES = [
  { freq: 784.0,  offset: 0 },    // G5
  { freq: 987.8,  offset: 0.15 }, // B5
  { freq: 1318.5, offset: 0.3 },  // E6
];

function playChime() {
  try {
    const ctx = getAudioCtx();
    // Schedule the notes synchronously, unconditionally — never gated
    // behind `ctx.resume().then(...)`. Desktop Chrome is lenient about
    // this (works fine either way), but Android Chrome/WebViews are much
    // stricter: they only count oscillator.start() as happening "inside
    // the user gesture" if it's called synchronously in the same call
    // stack as the click/tap. Scheduling it inside a resume() promise
    // callback runs one tick later — outside that window — and can
    // silently produce no sound on mobile even though the identical code
    // works on desktop. Nodes can be created/started on a still-suspended
    // context per spec; they just wait for resume() to actually render.
    const now = ctx.currentTime;
    CHIME_NOTES.forEach(({ freq, offset }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.45, now + offset + 0.015);
      // Slower decay than a flat beep — gives each note a "ring out"
      // bell-like tail instead of cutting off abruptly.
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.42);
    });

    if (ctx.state === "suspended") {
      ctx.resume().then(() => { audioBlockedWarned = false; }).catch((err) => {
        console.warn("[order-alert] audio blocked:", err?.name || err);
        warnAudioBlocked();
      });
    } else {
      audioBlockedWarned = false;
    }
  } catch (err) {
    console.warn("[order-alert] audio threw:", err);
    warnAudioBlocked();
  }
}

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

function enableAlertsGlobal() {
  // Runs inside a real click handler — required by browser autoplay policy
  // to unlock the AudioContext for the rest of the tab session.
  getAudioCtx().resume().catch(() => {});
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
// guaranteed no-op. `id` is the order's Mongo _id — a reliable, unique,
// server-assigned identifier — with orderId as a fallback only if _id is
// ever missing from the payload.
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
// on navigation (or React re-rendering) can never create a second
// connection/listener set.
function ensureSocket() {
  if (socket || !SOCKET_URL) return;
  socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });

  // Fires on the very first connect AND every reconnect alike — both cases
  // must treat already-known orders as already-known, never re-alert.
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
    // BottomNav remounting on every page navigation/re-render. It lives
    // for the whole tab session.
  }, []);

  const subscribe = useCallback((cb) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }, []);

  const enabledValue = useSyncExternalStore(subscribe, getEnabledSnapshot);
  const pendingCount = useSyncExternalStore(subscribe, getPendingCountSnapshot);

  return { enabled: enabledValue, enableAlerts: enableAlertsGlobal, pendingCount };
}
