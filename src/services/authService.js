// ─── src/services/authService.js ─────────────────────────────────────────────
import api from "./api.js";
export const sendOTP = (phone) => api.post("/auth/send-otp", { phone });
export const verifyOTP = (phone, otp) =>
  api.post("/auth/verify-otp", { phone, otp, name: "Waiter" });
