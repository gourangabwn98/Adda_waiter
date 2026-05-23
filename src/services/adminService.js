// ─── src/services/adminService.js ────────────────────────────────────────────
import api from "./api.js";
export const getDashboard = () => api.get("/admin/dashboard");
export const getAllOrders = (params) => api.get("/admin/orders", { params });
export const updateOrderStatus = (id, status) =>
  api.put(`/admin/orders/${id}/status`, { status });
export const getAllUsers = (params) => api.get("/admin/users", { params });
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);
// src/services/adminService.js
export const getAllInvoices = () => api.get("admin/invoices/all");
export const updateInvoiceStatus = (id, status) =>
  api.patch(`/admin/invoices/${id}/status`, { status });

// ── NEW TABLE MANAGEMENT APIs ─────────────────────────────────────
// export const getAllTables = () => api.get("admin/tables");

// export const createTable = (data) => api.post("admin/tables", data);

// export const updateTable = (tableNo, data) =>
//   api.put(`admin/tables/${tableNo}`, data);

// export const deleteTable = (tableNo) => api.delete(`admin/tables/${tableNo}`);
// ── tables ────────────────────────────────────────────────────────────────────
export const getAllTables = () => api.get("/admin/tables");
export const getTableByNo = (tableNo) => api.get(`/admin/tables/${tableNo}`);
export const createTable = (data) => api.post("/admin/tables", data);
export const updateTable = (tableNo, d) =>
  api.put(`/admin/tables/${tableNo}`, d);
export const deleteTable = (tableNo) => api.delete(`/admin/tables/${tableNo}`);
export const regenerateQR = (tableNo) =>
  api.post(`/admin/tables/${tableNo}/regenerate-qr`);

//for chef

export const getAllChefs = () => api.get("admin/chefs");
export const createChef = (data) => api.post("admin/chefs", data);
export const updateChefStatus = (id, status) =>
  api.patch(`admin/chefs/${id}/status`, { status });
export const deleteChef = (id) => api.delete(`admin/chefs/${id}`);

//admin profile

export const getRestaurantProfile = () => api.get("admin/restaurant/profile");
export const updateRestaurantProfile = (data) =>
  api.put("admin/restaurant/profile", data);
export const uploadRestaurantLogo = (formData) =>
  api.post("admin/restaurant/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
