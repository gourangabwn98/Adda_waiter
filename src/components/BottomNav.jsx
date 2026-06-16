// import { useNavigate, useLocation } from "react-router-dom";
// import { useAuth } from "../hooks/useAuth.js";

// const PINK = "#e91e8c";
// const GRAY = "#555";

// const tabs = [
//   { path: "/tables", icon: "🪑", label: "Tables" },
//   { path: "/menu", icon: "🍽️", label: "Menu" },
//   { path: "/cart", icon: "🛒", label: "Cart" },
//   { path: "/orders", icon: "📋", label: "Orders" },
// ];

// export default function BottomNav({ cartCount = 0 }) {
//   const nav = useNavigate();
//   const { pathname } = useLocation();
//   const { logout } = useAuth();

//   return (
//     <div
//       style={{
//         position: "fixed",
//         bottom: 0,
//         width: 420,
//         background: "#fff",
//         borderTop: "1px solid #eee",
//         display: "flex",
//         alignItems: "center",
//         zIndex: 100,
//         boxShadow: "0 -4px 16px rgba(0,0,0,.06)",
//       }}
//     >
//       {tabs.map((t) => {
//         const active = pathname === t.path;
//         return (
//           <button
//             key={t.path}
//             onClick={() => nav(t.path)}
//             style={{
//               flex: 1,
//               border: "none",
//               background: "none",
//               padding: "10px 0 8px",
//               cursor: "pointer",
//               display: "flex",
//               flexDirection: "column",
//               alignItems: "center",
//               gap: 2,
//               position: "relative",
//             }}
//           >
//             <span style={{ fontSize: 20, lineHeight: 1 }}>
//               {t.icon}
//               {t.path === "/cart" && cartCount > 0 && (
//                 <span
//                   style={{
//                     position: "absolute",
//                     top: 6,
//                     left: "52%",
//                     background: PINK,
//                     color: "#fff",
//                     borderRadius: "50%",
//                     width: 16,
//                     height: 16,
//                     fontSize: 10,
//                     fontWeight: 800,
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                   }}
//                 >
//                   {cartCount > 9 ? "9+" : cartCount}
//                 </span>
//               )}
//             </span>
//             <span
//               style={{
//                 fontSize: 10,
//                 fontWeight: 600,
//                 color: active ? PINK : GRAY,
//               }}
//             >
//               {t.label}
//             </span>
//             {active && (
//               <span
//                 style={{
//                   position: "absolute",
//                   bottom: 0,
//                   left: "50%",
//                   transform: "translateX(-50%)",
//                   width: 24,
//                   height: 3,
//                   borderRadius: 2,
//                   background: PINK,
//                 }}
//               />
//             )}
//           </button>
//         );
//       })}
//       {/* Logout button */}
//       <button
//         onClick={logout}
//         style={{
//           flex: 1,
//           border: "none",
//           background: "none",
//           padding: "10px 0 8px",
//           cursor: "pointer",
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           gap: 2,
//         }}
//       >
//         <span style={{ fontSize: 20, lineHeight: 1 }}>🚪</span>
//         <span style={{ fontSize: 10, fontWeight: 600, color: GRAY }}>
//           Logout
//         </span>
//       </button>
//     </div>
//   );
// }
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

const PINK = "#e91e8c";
const PINK_LIGHT = "#fce4f3";
const GRAY = "#555";

const tabs = [
  { path: "/tables", icon: "🪑", label: "Tables" },
  { path: "/menu", icon: "🍽️", label: "Menu" },
  { path: "/cart", icon: "🛒", label: "Cart" },
  { path: "/orders", icon: "📋", label: "Orders" },
];

// ── Logout Confirmation Modal ─────────────────────────────────────────────────
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        backdropFilter: "blur(2px)",
        animation: "fadeIn .18s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "28px 24px 20px",
          width: "100%",
          maxWidth: 320,
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,.18)",
          animation: "slideUp .22s cubic-bezier(.4,0,.2,1) both",
        }}
      >
        {/* icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: PINK_LIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            margin: "0 auto 16px",
          }}
        >
          🚪
        </div>

        <div style={{ fontSize: 17, fontWeight: 700, color: "#111", marginBottom: 8 }}>
          Logout?
        </div>
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 24 }}>
          Are you sure you want to logout? Any unsaved cart items will be lost.
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              border: "1.5px solid #e0e0e0",
              background: "#f5f5f5",
              color: "#555",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              border: "none",
              background: PINK,
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: `0 4px 14px ${PINK}44`,
            }}
          >
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
export default function BottomNav({ cartCount = 0 }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogoutConfirm = () => {
    setShowLogout(false);
    logout();
    nav("/");
  };

  return (
    <>
      {/* Confirmation modal */}
      {showLogout && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogout(false)}
        />
      )}

      <div
        style={{
          position: "fixed",
          bottom: 0,
          width: "100%",
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
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? PINK : GRAY }}>
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

        {/* Logout button — now opens modal */}
        <button
          onClick={() => setShowLogout(true)}
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
          <span style={{ fontSize: 20, lineHeight: 1,color:"red" }}>⏻</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: GRAY }}>Logout</span>
        </button>
      </div>
    </>
  );
}