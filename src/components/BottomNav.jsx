import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

const PINK = "#e91e8c";
const GRAY = "#555";

const tabs = [
  { path: "/tables", icon: "🪑", label: "Tables" },
  { path: "/menu", icon: "🍽️", label: "Menu" },
  { path: "/cart", icon: "🛒", label: "Cart" },
  { path: "/orders", icon: "📋", label: "Orders" },
];

export default function BottomNav({ cartCount = 0 }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAuth();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        width: 420,
        background: "#fff",
        borderTop: "1px solid #eee",
        display: "flex",
        alignItems: "center",
        zIndex: 100,
        boxShadow: "0 -4px 16px rgba(0,0,0,.06)",
      }}
    >
      {tabs.map((t) => {
        const active = pathname === t.path;
        return (
          <button
            key={t.path}
            onClick={() => nav(t.path)}
            style={{
              flex: 1,
              border: "none",
              background: "none",
              padding: "10px 0 8px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              position: "relative",
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>
              {t.icon}
              {t.path === "/cart" && cartCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    left: "52%",
                    background: PINK,
                    color: "#fff",
                    borderRadius: "50%",
                    width: 16,
                    height: 16,
                    fontSize: 10,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: active ? PINK : GRAY,
              }}
            >
              {t.label}
            </span>
            {active && (
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 24,
                  height: 3,
                  borderRadius: 2,
                  background: PINK,
                }}
              />
            )}
          </button>
        );
      })}
      {/* Logout button */}
      <button
        onClick={logout}
        style={{
          flex: 1,
          border: "none",
          background: "none",
          padding: "10px 0 8px",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>🚪</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: GRAY }}>
          Logout
        </span>
      </button>
    </div>
  );
}
