import api from "./api.js";

export const firebaseVerify = (firebaseToken, name) =>
  api.post("/auth/firebase-verify", { firebaseToken, name });