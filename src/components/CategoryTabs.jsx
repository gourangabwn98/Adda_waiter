const PINK = "#e91e8c";

export default function CategoryTabs({ categories = [], active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        padding: "10px 16px",
        scrollbarWidth: "none",
      }}
    >
      {["All", ...categories].map((cat) => {
        const isActive = active === cat;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            style={{
              whiteSpace: "nowrap",
              border: "none",
              cursor: "pointer",
              padding: "7px 16px",
              borderRadius: 30,
              fontSize: 13,
              fontWeight: 700,
              background: isActive ? PINK : "#f0f0f0",
              color: isActive ? "#fff" : "#555",
              transition: "all .15s",
              flexShrink: 0,
            }}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
