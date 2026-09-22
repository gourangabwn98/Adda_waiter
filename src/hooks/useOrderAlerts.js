// ─── hooks/useOrderAlerts.js ──────────────────────────────────────────────
// Audible + visible alert for new customer orders awaiting confirmation.
//
// Reuses the existing real-time architecture, unchanged:
//   - Backend emits "order-request" exactly once per order, and ONLY for
//     customer-placed orders — Admin/Waiter orders take the separate
//     `skipConfirmation` branch and never fire it (see
//     server/controllers/orderController.js placeOrder,
//     ORDER_SOURCES_SKIP_CONFIRMATION, verified unchanged). This is what
//     guarantees Admin/Waiter-created orders never alert — no frontend
//     filtering needed for that part. Backend Socket.IO CORS is `origin:
//     "*"` (server/server.js) so CORS is not what blocks production.
//   - "order-status-updated" already fires on accept/decline (acceptOrder/
//     declineOrder, same file), used here only to keep the pending count
//     accurate, not for alert logic.
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
//
// Android production audio, root-caused: a freshly-created/suspended
// AudioContext only reliably plays on Android Chrome/WebViews if
// oscillator.start() is called SYNCHRONOUSLY within the click/tap's call
// stack — not inside a ctx.resume().then(...) callback, which runs one
// microtask tick later, outside that window. Desktop Chrome doesn't
// enforce this as strictly, which is why "works on localhost, not on
// Android" was the exact symptom. Notes are now always scheduled
// synchronously; resume() runs in parallel, never gating playback.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { getAllOrders } from "../services/adminService.js";

const LOG = "[OrderAlert]";
const hasWindow = typeof window !== "undefined";
const hasDocument = typeof document !== "undefined";
const hasLocalStorage = typeof localStorage !== "undefined";

// import.meta.env.VITE_API_URL is a Vite build-time constant (browser
// only). The process.env fallback exists solely so this module can also be
// imported under plain Node for the automated tests in
// useOrderAlerts.test.js — `process` doesn't exist in the Vite browser
// bundle, so that branch is simply never reached there; production
// behavior is unchanged.
const SOCKET_URL = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  globalThis.process?.env?.VITE_API_URL ||
  ""
).replace(/\/api\/?$/, "");

const STORAGE_KEY = "adda_waiter_orderAlertsEnabled";

let socket = null;
let enabled = hasLocalStorage && localStorage.getItem(STORAGE_KEY) === "1";
let visibilityListenerAttached = false;

// Every order this tab session has ever accounted for (whether via a live
// "order-request" alert or a silent catch-up) — the single dedup guard
// that makes an order alert at most once, ever, no matter how many times
// its event is redelivered or how many times we reconnect/catch up. Keyed
// by the order's Mongo _id — a reliable, unique, server-assigned
// identifier — with orderId as a fallback only if _id is ever missing.
const seenOrderIds = new Set();
// Subset of seenOrderIds still awaiting confirmation — purely for the
// visible "N orders need attention" indicator, not used for alert logic.
const pendingOrderIds = new Set();

const listeners = new Set();
const notify = () => listeners.forEach((l) => l());
const getEnabledSnapshot = () => enabled;
const getPendingCountSnapshot = () => pendingOrderIds.size;

// ── Audio: Web Audio API primary ────────────────────────────────────────
// One persistent, reused AudioContext for the whole tab session — never
// recreated per play or per navigation, which is what made earlier
// attempts play once and then go silent (a freshly-created context starts
// "suspended" again under browser autoplay policy).
let audioCtx = null;
function getAudioCtx() {
  if (!hasWindow) return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
    // Logs every transition, including the iOS-only "interrupted" state
    // (e.g. an incoming phone call) and "suspended" (backgrounded/idle) —
    // visible in remote/USB devtools when debugging the Android build.
    audioCtx.addEventListener?.("statechange", () => {
      console.log(`${LOG} AudioContext state:`, audioCtx.state);
    });
  }
  return audioCtx;
}

// ── Audio: HTMLAudio fallback ────────────────────────────────────────────
// A short beep synthesized as a WAV Blob URL, built once, lazily, entirely
// client-side — no external mp3/file dependency (nothing to 404). Only
// used if the Web Audio path itself throws, per "use both Web Audio API
// and an HTMLAudio fallback."
let fallbackAudioUrl = null;
let fallbackAudioEl = null;
function buildFallbackBeepUrl() {
  if (fallbackAudioUrl) return fallbackAudioUrl;
  const sampleRate = 8000;
  const duration = 0.35;
  const freq = 1046;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, (duration - t) * 8, t * 40); // quick attack, fade out
    const sample = Math.max(-1, Math.min(1, Math.sin(2 * Math.PI * freq * t) * envelope * 0.6));
    view.setInt16(44 + i * 2, sample * 0x7fff, true);
  }
  fallbackAudioUrl = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  return fallbackAudioUrl;
}
function playFallbackBeep() {
  if (!hasWindow) return;
  try {
    if (!fallbackAudioEl) {
      fallbackAudioEl = new Audio(buildFallbackBeepUrl());
      fallbackAudioEl.volume = 0.9;
    }
    fallbackAudioEl.currentTime = 0;
    fallbackAudioEl.play()?.catch((err) => {
      console.warn(`${LOG} HTMLAudio fallback also failed:`, err?.name || err);
    });
  } catch (err) {
    console.warn(`${LOG} HTMLAudio fallback threw:`, err);
  }
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
  console.log(`${LOG} Playing alert`);
  const ctx = getAudioCtx();
  if (!ctx) {
    console.warn(`${LOG} Web Audio unavailable, using HTMLAudio fallback`);
    playFallbackBeep();
    return;
  }
  try {
    console.log(`${LOG} AudioContext state:`, ctx.state);
    // Schedule the notes synchronously, unconditionally — never gated
    // behind `ctx.resume().then(...)`. Desktop Chrome is lenient about
    // this (plays fine either way), but Android Chrome/WebViews only
    // count oscillator.start() as happening "inside the user gesture" if
    // it's called synchronously in the same call stack as the click/tap
    // that triggered it (see module header). Nodes can be created/started
    // on a still-suspended context per spec — they just wait for resume()
    // to actually render audio.
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
    console.log(`${LOG} Alert playback scheduled successfully`);

    if (ctx.state === "suspended") {
      ctx.resume()
        .then(() => {
          audioBlockedWarned = false;
          console.log(`${LOG} AudioContext resumed, state:`, ctx.state);
        })
        .catch((err) => {
          console.warn(`${LOG} AudioContext resume blocked:`, err?.name || err);
          playFallbackBeep();
          warnAudioBlocked();
        });
    } else {
      audioBlockedWarned = false;
    }
  } catch (err) {
    console.warn(`${LOG} Web Audio scheduling threw, using HTMLAudio fallback:`, err);
    playFallbackBeep();
    warnAudioBlocked();
  }
}

function enableAlertsGlobal() {
  // Runs inside a real click handler — required by browser autoplay policy
  // to unlock the AudioContext for the rest of the tab session.
  getAudioCtx()?.resume().catch(() => {});
  playChime(); // audible confirmation it's on
  if (hasLocalStorage) localStorage.setItem(STORAGE_KEY, "1");
  enabled = true;
  console.log(`${LOG} Alert enabled:`, enabled);
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
  console.log(`${LOG} New order event received`);
  console.log(`${LOG} Order ID:`, id || "(missing)");
  console.log(`${LOG} Status:`, order?.status || "(missing)");

  const isNew = !!id && !seenOrderIds.has(id);
  console.log(`${LOG} Is new:`, isNew);
  if (!isNew) return;

  seenOrderIds.add(id);
  pendingOrderIds.add(id);
  notify();

  // Table number only — no customer name/phone/items logged or included
  // beyond what's already shown in the UI toast itself.
  toast(
    `🔔 New customer order — Table ${order?.tableNo ?? "-"} (${order?.orderId ?? ""})`,
    { icon: "🔔", duration: 6000 },
  );

  console.log(`${LOG} Alert enabled:`, enabled);
  if (enabled) playChime();
}

// Orders already PendingConfirmation right now — marked seen silently, no
// sound. Runs on every socket "connect" (fires for the initial connect AND
// every reconnect alike), so both the refresh case and the reconnect case
// go through this same, single code path.
function catchUpPendingOrders() {
  // Returned (not fire-and-forget) so callers — and tests — can await it;
  // production call sites don't need to and simply don't await it.
  return getAllOrders({ status: "PendingConfirmation", limit: 100 })
    .then((res) => {
      const orders = res.data?.orders || [];
      orders.forEach((o) => markSeenSilently(o._id));
    })
    .catch((err) => {
      console.warn(`${LOG} catch-up fetch failed:`, err?.message || err);
    });
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
  socket.on("connect", () => {
    console.log(`${LOG} Socket connected`);
    catchUpPendingOrders();
  });
  socket.on("order-request", alertForNewOrder);
  socket.on("order-status-updated", (order) => {
    if (order?._id && order.status !== "PendingConfirmation") markResolved(order._id);
  });

  // When the phone is unlocked / the tab comes back to the foreground,
  // proactively try to resume the AudioContext instead of waiting for the
  // next order to discover it's suspended. This does NOT retroactively
  // play sound for anything that arrived while backgrounded — that's
  // handled correctly (silently) by the "connect" catch-up above, since
  // there's no reliable way to distinguish "missed while locked" from
  // "genuinely old" once reconnected. See the final report for the
  // platform-level limitation this can't fully solve (OS-suspended
  // background tabs/locked screens cannot play audio from JS at all,
  // on Android or otherwise — this is intentional OS behavior, not a bug
  // in this code).
  if (hasDocument && !visibilityListenerAttached) {
    visibilityListenerAttached = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      const ctx = audioCtx;
      if (ctx && ctx.state === "suspended") {
        console.log(`${LOG} Tab visible again, resuming AudioContext`);
        ctx.resume().catch(() => {});
      }
    });
  }
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

// ── Test-only exports ───────────────────────────────────────────────────
// Exposes the underlying pure logic for the automated tests in
// useOrderAlerts.test.js, run via Node's built-in test runner (no new
// package installed). Testing goes through this object rather than
// rendering the React hook itself, which would need a DOM/React-testing
// dependency; the hook above is a thin, low-risk adapter over this logic.
// Never imported by application code.
export const __testing = {
  alertForNewOrder,
  markSeenSilently,
  markResolved,
  catchUpPendingOrders,
  ensureSocket,
  enableAlertsGlobal,
  isEnabled: () => enabled,
  getSeenCount: () => seenOrderIds.size,
  getPendingCount: () => pendingOrderIds.size,
  hasSocket: () => !!socket,
  reset: () => {
    socket = null;
    enabled = false;
    seenOrderIds.clear();
    pendingOrderIds.clear();
    listeners.clear();
    audioBlockedWarned = false;
    visibilityListenerAttached = false;
  },
};
