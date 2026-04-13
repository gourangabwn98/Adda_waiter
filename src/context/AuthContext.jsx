// ─── src/context/AuthContext.jsx ──────────────────────────────────────────────
import { createContext, useState } from "react";
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("waiterUser"));
    } catch {
      return null;
    }
  });
  const login = (d) => {
    setUser(d);
    localStorage.setItem("waiterUser", JSON.stringify(d));
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem("waiterUser");
  };
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
