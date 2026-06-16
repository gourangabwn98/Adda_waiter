// ─── src/App.jsx ──────────────────────────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.js";
import LoginPage from "./pages/LoginPage.jsx";
import TablesPage from "./pages/TablesPage.jsx";
import MenuPage from "./pages/MenuPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import "./App.css";

const Guard = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="app-container">
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route
              path="/tables"
              element={
                <Guard>
                  <TablesPage />
                </Guard>
              }
            />
            <Route
              path="/menu"
              element={
                <Guard>
                  <MenuPage />
                </Guard>
              }
            />
            <Route
              path="/cart"
              element={
                <Guard>
                  <CartPage />
                </Guard>
              }
            />
            <Route
              path="/orders"
              element={
                <Guard>
                  <OrdersPage />
                </Guard>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}