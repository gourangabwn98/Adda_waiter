import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendOTP } from "../services/authService.js";
import { useAuth } from "../hooks/useAuth.js";
import TopBar from "../components/TopBar.jsx";
import PinkBtn from "../components/PinkBtn.jsx";
import { pink } from "../components/theme.js";
import toast from "react-hot-toast";

export default function LoginPage() {
  const nav = useNavigate();
  const { loginAsGuest } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSkip = () => {
    loginAsGuest(); // sets guest user in context + localStorage
    nav("/menu");
    toast("Browsing as Guest 👋", { icon: "🛍️" });
  };

  const handle = async () => {
    if (!phone || phone.length < 10)
      return toast.error("Enter valid 10-digit phone number");
    try {
      setLoading(true);
      await sendOTP(phone);
      sessionStorage.setItem("otpPhone", phone);
      sessionStorage.setItem("otpName", name);
      nav("/otp");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <TopBar
        title="Login Account"
        right={
          <span
            onClick={handleSkip}
            style={{
              color: pink,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              padding: "4px 8px",
            }}
          >
            Skip
          </span>
        }
      />
      <div
        style={{
          flex: 1,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div
            style={{
              width: 88,
              height: 88,
              background: "#f0f0f0",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 8px",
              fontSize: 42,
            }}
          >
            👤
          </div>
          <div style={{ color: "#888", fontSize: 13 }}>
            Enter your details to continue
          </div>
        </div>

        <Field
          label="Your Name"
          value={name}
          onChange={setName}
          placeholder="Enter Your Name"
        />

        <div>
          <label
            style={{
              fontSize: 12,
              color: "#666",
              display: "block",
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            Phone Number
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                padding: "12px 14px",
                border: "1px solid #ddd",
                borderRadius: 12,
                background: "#f9f9f9",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 14,
              }}
            >
              🇮🇳 <span style={{ color: "#555" }}>+91</span>
            </div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
              placeholder="123 456 7890"
              type="tel"
              style={{
                flex: 1,
                padding: "12px 14px",
                border: "1px solid #ddd",
                borderRadius: 12,
                fontSize: 14,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>
        </div>

        <PinkBtn onClick={handle} disabled={loading}>
          {loading ? "Sending OTP…" : "Next & Verify Phone Number"}
        </PinkBtn>

        <div style={{ textAlign: "center", color: "#aaa", fontSize: 12 }}>
          — or —
        </div>

        <button
          onClick={handleSkip}
          style={{
            width: "100%",
            padding: "12px 0",
            border: "1.5px dashed #ddd",
            borderRadius: 25,
            background: "transparent",
            color: "#888",
            fontSize: 14,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Continue as Guest 👋
        </button>
      </div>
    </div>
  );
}

const Field = ({ label, value, onChange, placeholder }) => (
  <div>
    <label
      style={{
        fontSize: 12,
        color: "#666",
        display: "block",
        marginBottom: 6,
        fontWeight: 600,
      }}
    >
      {label}
    </label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "12px 14px",
        border: "1px solid #ddd",
        borderRadius: 12,
        fontSize: 14,
        boxSizing: "border-box",
        outline: "none",
      }}
    />
  </div>
);
