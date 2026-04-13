// ─── src/services/tableService.js ────────────────────────────────────────────
import api from "./api.js";
export const getTables = () => api.get("admin/tables");
