import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sendOTP, verifyOTP } from "../services/authService.js";
import { useAuth } from "../hooks/useAuth.js";
import toast from "react-hot-toast";

const PINK = "#e91e8c";
const BG = "#1a1a2e";
const WHITE = "#fff";

export default function LoginPage() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [timer, setTimer] = useState(120);
  const [loading, setLoading] = useState(false);
  const refs = Array.from({ length: 6 }, () => useRef(null));

  useEffect(() => {
    if (step !== "otp") return;
    const id = setInterval(() => setTimer((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step]);

  const handleSend = async () => {
    if (!name.trim()) return toast.error("Enter your name");
    if (phone.length < 10) return toast.error("Enter valid phone number");
    try {
      setLoading(true);
      await sendOTP(phone);
      sessionStorage.setItem("waiterName", name);
      sessionStorage.setItem("waiterPhone", phone);
      setStep("otp");
      toast.success("OTP sent!");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) return toast.error("Enter 6-digit OTP");
    try {
      setLoading(true);
      const { data } = await verifyOTP(phone, code);
      login({ ...data, waiterName: name });
      nav("/tables");
      toast.success(`Welcome, ${name}! 👋`);
    } catch (e) {
      toast.error(e.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, v) => {
    if (!/^\d*$/.test(v)) return;
    const n = [...otp];
    n[i] = v.slice(-1);
    setOtp(n);
    if (v && i < 5) refs[i + 1].current?.focus();
  };
  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) refs[i - 1].current?.focus();
  };

  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");
  const inp = {
    width: "100%",
    padding: "13px 16px",
    borderRadius: 12,
    border: "1px solid #2a2a3e",
    background: "#16162a",
    color: WHITE,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div
          style={{
            width: 64,
            height: 64,
            background: PINK,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 12px",
          }}
        >
          🧑‍🍽️
        </div>
        <div style={{ color: WHITE, fontSize: 24, fontWeight: 800 }}>
          আড্ডা Waiter
        </div>
        <div
          style={{
            color: "#666",
            fontSize: 12,
            letterSpacing: 3,
            marginTop: 3,
          }}
        >
          ORDER MANAGEMENT
        </div>
      </div>

      <div
        style={{
          background: "#16162a",
          borderRadius: 20,
          padding: 28,
          width: "100%",
        }}
      >
        {step === "phone" ? (
          <>
            <div
              style={{
                color: WHITE,
                fontWeight: 600,
                fontSize: 16,
                marginBottom: 20,
              }}
            >
              Sign In
            </div>
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  color: "#888",
                  fontSize: 12,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Your Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                style={inp}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  color: "#888",
                  fontSize: 12,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Phone Number
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <div
                  style={{
                    ...inp,
                    width: "auto",
                    padding: "13px 12px",
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  🇮🇳 <span style={{ color: "#aaa" }}>+91</span>
                </div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  maxLength={10}
                  placeholder="123 456 7890"
                  type="tel"
                  style={{ ...inp }}
                />
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 30,
                border: "none",
                background: loading ? "#555" : PINK,
                color: WHITE,
                fontWeight: 800,
                fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sending…" : "Send OTP"}
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                color: WHITE,
                fontWeight: 600,
                fontSize: 16,
                marginBottom: 6,
              }}
            >
              Verify OTP
            </div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>
              Code sent to <span style={{ color: PINK }}>+91 {phone}</span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              {otp.map((v, i) => (
                <input
                  key={i}
                  ref={refs[i]}
                  value={v}
                  maxLength={1}
                   inputMode="numeric"     // ✅ mobile keyboard numeric
  pattern="[0-9]*"        // ✅ hint for browsers
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKey(i, e)}
                  style={{
                    width: 46,
                    height: 54,
                    textAlign: "center",
                    border: `2px solid ${v ? PINK : "#2a2a3e"}`,
                    borderRadius: 12,
                    background: "#16162a",
                    color: WHITE,
                    fontSize: 22,
                    fontWeight: 700,
                    outline: "none",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                textAlign: "center",
                color: "#666",
                fontSize: 13,
                marginBottom: 24,
              }}
            >
              {timer > 0 ? (
                <>
                  Resend in{" "}
                  <span style={{ color: PINK, fontWeight: 700 }}>
                    {mm}:{ss}
                  </span>
                </>
              ) : (
                <span
                  onClick={async () => {
                    await sendOTP(phone);
                    setTimer(120);
                    setOtp(Array(6).fill(""));
                  }}
                  style={{ color: PINK, cursor: "pointer", fontWeight: 700 }}
                >
                  Resend OTP
                </span>
              )}
            </div>
            <button
              onClick={handleVerify}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 30,
                border: "none",
                background: loading ? "#555" : PINK,
                color: WHITE,
                fontWeight: 800,
                fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Verifying…" : "Verify & Login"}
            </button>
            <div
              onClick={() => {
                setStep("phone");
                setOtp(Array(6).fill(""));
              }}
              style={{
                textAlign: "center",
                color: PINK,
                marginTop: 14,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ← Change number
            </div>
          </>
        )}
      </div>
    </div>
  );
}
