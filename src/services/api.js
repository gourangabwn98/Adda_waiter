// ─── src/services/api.js ─────────────────────────────────────────────────────
import axios from "axios";
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
api.interceptors.request.use((cfg) => {
  const u = JSON.parse(localStorage.getItem("waiterUser") || "null");
  if (u?.token) cfg.headers.Authorization = `Bearer ${u.token}`;
  return cfg;
});
api.interceptors.response.use(
  (r) => r,
  (err) => {
   if (err.response?.status === 401) {
  localStorage.removeItem("waiterUser");

  if (window.location.pathname !== "/") {
    window.location.href = "/";
  }
}
    return Promise.reject(err);
  },
);
export default api;
