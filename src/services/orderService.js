// ─── src/services/orderService.js ────────────────────────────────────────────
import api from "./api.js";
export const placeOrder = (data) => api.post("/orders", data);
export const getMyOrders = () =>
  api.get("/admin/orders", { params: { limit: 100 } });
