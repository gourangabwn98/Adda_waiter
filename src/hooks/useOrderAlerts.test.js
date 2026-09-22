// ─── hooks/useOrderAlerts.test.js ─────────────────────────────────────────
// Automated tests for the order-alert dedup/alert-decision logic, run via
// Node's built-in test runner — no new package installed (Node 18+ ships
// node:test/node:assert; module mocking needs Node's
// --experimental-test-module-mocks flag, also built in).
//
//   node --experimental-test-module-mocks --test
//
// Scope: this tests the pure module-level logic (dedup, catch-up,
// enable/disable gating, socket-listener singleton) that useOrderAlerts.js
// exports via `__testing`. It does NOT render the React hook itself
// (would need a DOM + React-testing-library, an extra dependency this
// project doesn't have and which the task asked not to add) — that layer
// is a thin, low-risk adapter (useEffect + useSyncExternalStore) over the
// logic tested here. It also cannot verify that a human actually HEARS
// sound on a real Android device — see the manual test checklist in the
// written report for that.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

// ── Minimal browser-API shims ───────────────────────────────────────────
class FakeGainNode {
  constructor() {
    this.gain = {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    };
  }
  connect() { return this; }
}
class FakeOscillatorNode {
  constructor() { this.frequency = { value: 0 }; this.type = ""; }
  connect() { return this; }
  start() { FakeAudioContext.startCalls++; }
  stop() {}
}
class FakeAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
    this.destination = {};
    FakeAudioContext.instances++;
  }
  createOscillator() { return new FakeOscillatorNode(); }
  createGain() { return new FakeGainNode(); }
  resume() { this.state = "running"; return Promise.resolve(); }
  addEventListener() {}
}
FakeAudioContext.instances = 0;
FakeAudioContext.startCalls = 0;

class FakeStorage {
  constructor() { this.store = {}; }
  getItem(k) { return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null; }
  setItem(k, v) { this.store[k] = String(v); }
}

globalThis.window = globalThis.window || {};
globalThis.window.AudioContext = FakeAudioContext;
globalThis.localStorage = new FakeStorage();
globalThis.document = globalThis.document || { addEventListener() {}, visibilityState: "visible" };
// Referenced via globalThis.process in the hook (Node-test-only fallback
// for import.meta.env.VITE_API_URL, which doesn't exist outside Vite) —
// must be non-empty for ensureSocket()'s guard to proceed.
globalThis.process = globalThis.process || {};
globalThis.process.env = { ...(globalThis.process.env || {}), VITE_API_URL: "http://test.local/api" };

// ── Mock socket.io-client ───────────────────────────────────────────────
class FakeSocket {
  constructor() { this.handlers = {}; FakeSocket.instances.push(this); }
  on(event, cb) { (this.handlers[event] ||= []).push(cb); }
  trigger(event, ...args) { (this.handlers[event] || []).forEach((cb) => cb(...args)); }
}
FakeSocket.instances = [];

mock.module("socket.io-client", {
  namedExports: { io: () => new FakeSocket() },
});

// ── Mock react-hot-toast ────────────────────────────────────────────────
const toastCalls = [];
function toastFn(...args) { toastCalls.push({ type: "info", args }); }
toastFn.error = (...args) => { toastCalls.push({ type: "error", args }); };
mock.module("react-hot-toast", { defaultExport: toastFn });

// ── Mock the order-fetch service (no real HTTP call in tests) ──────────
let mockPendingOrders = [];
mock.module("../services/adminService.js", {
  namedExports: {
    getAllOrders: async () => ({ data: { orders: mockPendingOrders } }),
  },
});

const { __testing } = await import("./useOrderAlerts.js");

beforeEach(() => {
  __testing.reset();
  toastCalls.length = 0;
  FakeSocket.instances.length = 0;
  FakeAudioContext.instances = 0;
  FakeAudioContext.startCalls = 0;
  mockPendingOrders = [];
});

test("1. New AWAITING_CONFIRMATION customer order -> alert triggered (toast + sound)", () => {
  __testing.enableAlertsGlobal();
  toastCalls.length = 0; // clear the "enable" confirmation toast, if any
  const startsBefore = FakeAudioContext.startCalls;

  __testing.alertForNewOrder({ _id: "o1", orderId: "ADDA00001", status: "PendingConfirmation", tableNo: 3 });

  assert.equal(toastCalls.length, 1, "a visible toast must fire for a new order");
  assert.ok(FakeAudioContext.startCalls > startsBefore, "audio must be scheduled");
});

test("2. Existing orders on initial load -> no alert (silent catch-up)", async () => {
  mockPendingOrders = [{ _id: "old1" }, { _id: "old2" }];
  await __testing.catchUpPendingOrders();

  assert.equal(toastCalls.length, 0, "catch-up must never toast");
  assert.equal(__testing.getPendingCount(), 2, "orders are still tracked, just silently");
});

test("3. Refresh (fresh module state) -> no alert for pre-existing orders", async () => {
  mockPendingOrders = [{ _id: "existing1" }];
  __testing.reset(); // simulates the module re-initializing after a real browser refresh
  await __testing.catchUpPendingOrders();

  assert.equal(toastCalls.length, 0);
  assert.equal(__testing.getSeenCount(), 1);
});

test("4. Socket reconnect (catch-up re-runs) -> no alert for already-known orders", async () => {
  mockPendingOrders = [{ _id: "r1" }];
  await __testing.catchUpPendingOrders(); // first connect
  toastCalls.length = 0;

  await __testing.catchUpPendingOrders(); // simulated reconnect re-running the same catch-up
  assert.equal(toastCalls.length, 0, "already-known orders must not re-alert on reconnect");
});

test("5. Duplicate event for the same order ID -> only one alert", () => {
  __testing.enableAlertsGlobal();
  toastCalls.length = 0;

  __testing.alertForNewOrder({ _id: "dup1", orderId: "A1", status: "PendingConfirmation" });
  __testing.alertForNewOrder({ _id: "dup1", orderId: "A1", status: "PendingConfirmation" });

  assert.equal(toastCalls.length, 1);
});

test("6. Two different new order IDs -> two separate alerts", () => {
  __testing.enableAlertsGlobal();
  toastCalls.length = 0;

  __testing.alertForNewOrder({ _id: "a", status: "PendingConfirmation" });
  __testing.alertForNewOrder({ _id: "b", status: "PendingConfirmation" });

  assert.equal(toastCalls.length, 2);
});

test("7&8. Admin/Waiter-created orders: enforced server-side, not client-side", () => {
  // server/controllers/orderController.js only emits "order-request" in the
  // !skipConfirmation branch, and skipConfirmation is true precisely when
  // orderSource is "admin" or "waiter" (ORDER_SOURCES_SKIP_CONFIRMATION).
  // The Waiter frontend's socket handler is never invoked at all for those
  // orders — there is no client-side code path to unit test here. Verified
  // by direct code inspection; see the written report.
});

test("9. Frontend trusts the server's status filtering by design (no re-filtering here)", () => {
  // alertForNewOrder does not itself branch on `order.status` — it relies
  // on the backend to only ever emit "order-request" for PendingConfirmation
  // orders, per the "do not change order status/workflow logic" constraint.
  // This asserts the (only) actual behavior: a well-formed PendingConfirmation
  // payload alerts normally.
  __testing.enableAlertsGlobal();
  toastCalls.length = 0;
  __testing.alertForNewOrder({ _id: "s1", status: "PendingConfirmation" });
  assert.equal(toastCalls.length, 1);
});

test("10. Alerts disabled -> toast still shows, but no audio playback attempt", () => {
  // enabled defaults to false after reset()
  const startsBefore = FakeAudioContext.startCalls;
  __testing.alertForNewOrder({ _id: "d1", status: "PendingConfirmation" });

  assert.equal(toastCalls.length, 1, "visible alert always fires");
  assert.equal(FakeAudioContext.startCalls, startsBefore, "no audio scheduled while disabled");
});

test("11. Alerts enabled -> audio playback is triggered", () => {
  __testing.enableAlertsGlobal();
  const startsBefore = FakeAudioContext.startCalls;
  __testing.alertForNewOrder({ _id: "e1", status: "PendingConfirmation" });
  assert.ok(FakeAudioContext.startCalls > startsBefore);
});

test("12. Socket connection/listeners are registered only once", () => {
  __testing.ensureSocket();
  __testing.ensureSocket();
  __testing.ensureSocket();
  assert.equal(FakeSocket.instances.length, 1, "io() must be called exactly once no matter how many times ensureSocket runs (simulates repeated BottomNav mounts)");
});

test("13. No per-mount cleanup by design; singleton survives repeated ensureSocket calls", () => {
  // There is deliberately no socket.disconnect()/listener-removal on
  // "unmount" — BottomNav remounts on every page navigation, and the
  // socket/dedup state must survive that (see module header comment in
  // useOrderAlerts.js). What matters is that repeated calls never create a
  // second connection — verified here and in test 12.
  __testing.ensureSocket();
  const first = __testing.hasSocket();
  __testing.ensureSocket();
  const second = __testing.hasSocket();

  assert.equal(first, true);
  assert.equal(second, true);
  assert.equal(FakeSocket.instances.length, 1);
});

test("bonus: enableAlertsGlobal persists the enabled flag", () => {
  assert.equal(__testing.isEnabled(), false);
  __testing.enableAlertsGlobal();
  assert.equal(__testing.isEnabled(), true);
});

test("bonus: markResolved removes an order from the pending count", () => {
  __testing.markSeenSilently("x1");
  assert.equal(__testing.getPendingCount(), 1);
  __testing.markResolved("x1");
  assert.equal(__testing.getPendingCount(), 0);
});
