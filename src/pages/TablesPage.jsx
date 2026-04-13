import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTables } from "../services/tableService.js";
import { useAuth } from "../hooks/useAuth.js";
import toast from "react-hot-toast";

const PINK = "#e91e8c";
const WHITE = "#fff";
const GREEN = "#1D9E75";

export default function TablesPage() {
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTables()
      .then((r) => {
        setTables(r.data?.tables || r.data || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load tables");
        setLoading(false);
      });
  }, []);

  const handleSelect = (table) => {
    if (table.status === "Inactive")
      return toast.error(`Table ${table.tableNo} is inactive`);
    sessionStorage.setItem("selectedTable", JSON.stringify(table));
    sessionStorage.setItem("cart", JSON.stringify([]));
    nav("/menu");
  };

  const activeTables = tables.filter((t) => t.status !== "Inactive");
  const inactiveTables = tables.filter((t) => t.status === "Inactive");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: PINK,
          padding: "18px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ color: WHITE, fontWeight: 800, fontSize: 18 }}>
            আড্ডা Waiter
          </div>
          <div
            style={{
              color: "rgba(255,255,255,.75)",
              fontSize: 12,
              marginTop: 2,
            }}
          >
            👋 {user?.waiterName || user?.name || "Waiter"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => nav("/orders")}
            style={{
              background: "rgba(255,255,255,.2)",
              border: "none",
              color: WHITE,
              borderRadius: 20,
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            📋 Orders
          </button>
          <button
            onClick={() => {
              logout();
              nav("/");
            }}
            style={{
              background: "rgba(255,255,255,.15)",
              border: "none",
              color: WHITE,
              borderRadius: 20,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Exit
          </button>
        </div>
      </div>

      <div style={{ padding: 20, flex: 1 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            marginBottom: 4,
            color: "#222",
          }}
        >
          Select a Table
        </div>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: 18 }}>
          Tap a table to start taking order
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#aaa" }}>
            Loading tables…
          </div>
        ) : tables.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#bbb" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🪑</div>
            <div>No tables configured</div>
          </div>
        ) : (
          <>
            {/* Active tables */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {activeTables.map((t) => (
                <div
                  key={t.tableNo}
                  onClick={() => handleSelect(t)}
                  style={{
                    background: WHITE,
                    borderRadius: 16,
                    padding: "18px 10px",
                    textAlign: "center",
                    cursor: "pointer",
                    border: `2px solid ${PINK}22`,
                    boxShadow: "0 2px 10px rgba(0,0,0,.07)",
                    transition: "all .15s",
                    position: "relative",
                  }}
                >
                  {/* table icon */}
                  <div style={{ fontSize: 32, marginBottom: 6 }}>🪑</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: "#222" }}>
                    T{t.tableNo}
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>
                    {t.seats} seats
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      display: "inline-block",
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      background: `${GREEN}18`,
                      color: GREEN,
                    }}
                  >
                    Active
                  </div>
                  {/* pink bar at top */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "15%",
                      right: "15%",
                      height: 3,
                      background: PINK,
                      borderRadius: "0 0 4px 4px",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Inactive tables */}
            {inactiveTables.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: 12,
                    color: "#bbb",
                    fontWeight: 600,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Inactive Tables
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 12,
                  }}
                >
                  {inactiveTables.map((t) => (
                    <div
                      key={t.tableNo}
                      style={{
                        background: "#f5f5f5",
                        borderRadius: 16,
                        padding: "18px 10px",
                        textAlign: "center",
                        opacity: 0.5,
                        border: "2px solid #ddd",
                      }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 6 }}>🪑</div>
                      <div
                        style={{ fontWeight: 800, fontSize: 18, color: "#999" }}
                      >
                        T{t.tableNo}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}
                      >
                        {t.seats} seats
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          background: "#eee",
                          color: "#bbb",
                        }}
                      >
                        Inactive
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
