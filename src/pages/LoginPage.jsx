import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { firebaseVerify } from "../services/authService.js";
import { auth } from "../services/firebase.js";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useAuth } from "../hooks/useAuth.js";
import toast from "react-hot-toast";
import { getAllChefs } from "../services/adminService.js";

const PINK  = "#e91e8c";
const BG    = "#1a1a2e";
const WHITE = "#fff";

let currentVerifier = null;

export default function LoginPage() {
  const nav       = useNavigate();
  const { login } = useAuth();

  const [step,    setStep]    = useState("phone");
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [otp,     setOtp]     = useState(Array(6).fill(""));
  const [timer,   setTimer]   = useState(120);
  const [loading, setLoading] = useState(false);
  const [chefs,   setChefs]   = useState([]);

  // const refs = Array.from({ length: 6 }, () => useRef(null));
  const ref0 = useRef(null);
const ref1 = useRef(null);
const ref2 = useRef(null);
const ref3 = useRef(null);
const ref4 = useRef(null);
const ref5 = useRef(null);
const refs = [ref0, ref1, ref2, ref3, ref4, ref5];

useEffect(() => {
  console.log("Fetching chefs...");

  getAllChefs()
    .then((res) => {
      console.log("API Response:", res);

      const data = res.data?.data || res.data?.chefs || res.data;
      setChefs(Array.isArray(data) ? data : []);
    })
    .catch((err) => {
      console.error("API Error:", err);
      setChefs([]);
    });
}, []);

  // ── OTP timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "otp") return;
    refs[0].current?.focus();
    const id = setInterval(() => setTimer(t => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step]);

  // ── Recaptcha helpers ──────────────────────────────────────────────────────
  const clearVerifier = () => {
    if (currentVerifier) {
      try { currentVerifier.clear(); } catch (_) {}
      currentVerifier = null;
    }
    const box = document.getElementById("recaptcha-box");
    if (box) box.innerHTML = "";
  };

  const sendFirebaseOTP = async () => {
    clearVerifier();
    currentVerifier = new RecaptchaVerifier(auth, "recaptcha-box", {
      size: "invisible",
    });
    await currentVerifier.render();
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      `+91${phone}`,
      currentVerifier,
    );
    currentVerifier.clear();
    const box = document.getElementById("recaptcha-box");
    if (box) box.innerHTML = "";
    window.confirmationResult = confirmationResult;
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!phone)              return toast.error("Please select your account");
    if (phone.length < 10)  return toast.error("Invalid phone number");
    try {
      setLoading(true);
      await sendFirebaseOTP();
      setStep("otp");
      setTimer(120);
      toast.success("OTP sent!");
    } catch (e) {
      console.error("Send OTP error:", e.code, e.message);
      clearVerifier();
      if (e.code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please wait.");
      } else {
        toast.error("Failed to send OTP. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) return toast.error("Enter 6-digit OTP");
    if (!window.confirmationResult) {
      toast.error("Session expired. Please resend OTP.");
      setStep("phone");
      return;
    }
    try {
      setLoading(true);
      const result       = await window.confirmationResult.confirm(code);
      const firebaseToken = await result.user.getIdToken();
      const { data }     = await firebaseVerify(firebaseToken, name);
      login({ ...data, waiterName: name });
      window.confirmationResult = null;
      nav("/tables");
      toast.success(`Welcome, ${name}! 👋`);
    } catch (e) {
      console.error("Verify error:", e.code, e.message);
      if (e.code === "auth/invalid-verification-code") {
        toast.error("Wrong OTP. Try again.");
      } else if (e.code === "auth/code-expired") {
        toast.error("OTP expired. Please resend.");
      } else {
        toast.error("Verification failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    try {
      setLoading(true);
      await sendFirebaseOTP();
      setTimer(120);
      setOtp(Array(6).fill(""));
      toast.success("OTP resent!");
    } catch (e) {
      clearVerifier();
      toast.error("Failed to resend OTP.");
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
    if (e.key === "Backspace" && !otp[i] && i > 0)
      refs[i - 1].current?.focus();
  };

  // ── Derived ────────────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
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
            width: 64, height: 64, background: PINK, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, margin: "0 auto 12px",
          }}
        >
          🧑‍🍽️
        </div>
        <div style={{ color: WHITE, fontSize: 24, fontWeight: 800 }}>আড্ডা Waiter</div>
        <div style={{ color: "#666", fontSize: 12, letterSpacing: 3, marginTop: 3 }}>
          ORDER MANAGEMENT
        </div>
      </div>

      <div style={{ background: "#16162a", borderRadius: 20, padding: 28, width: "100%" }}>

        {step === "phone" ? (
          <>
            <div style={{ color: WHITE, fontWeight: 600, fontSize: 16, marginBottom: 20 }}>
              Sign In
            </div>

            {/* Chef / Waiter dropdown */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ color: "#888", fontSize: 12, display: "block", marginBottom: 6 }}>
                Select Your Account
              </label>
              <select
                value={phone}
                onChange={(e) => {
                  const selected = chefs.find(c => c.phone === e.target.value);
                  setPhone(e.target.value);
                  if (selected) setName(selected.name);
                }}
                style={{
                  ...inp,
                  cursor: "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 14px center",
                  paddingRight: 38,
                }}
              >
                <option value="" disabled>— Select waiter / chef —</option>
                {chefs.map(c => (
                  <option key={c._id} value={c.phone}>
                    {c.name}  •  +91 {c.phone}
                  </option>
                ))}
              </select>

              {/* Show selected info */}
              {phone && name && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 14px",
                    background: "#1e1e35",
                    borderRadius: 10,
                    border: "1px solid #2a2a4a",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: PINK, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 16, flexShrink: 0,
                    }}
                  >
                    👤
                  </div>
                  <div>
                    <div style={{ color: WHITE, fontSize: 13, fontWeight: 600 }}>{name}</div>
                    <div style={{ color: "#888", fontSize: 12 }}>+91 {phone}</div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={loading || !phone}
              style={{
                width: "100%", padding: "14px", borderRadius: 30, border: "none",
                background: loading || !phone ? "#333" : PINK,
                color: loading || !phone ? "#666" : WHITE,
                fontWeight: 800, fontSize: 15,
                cursor: loading || !phone ? "not-allowed" : "pointer",
                transition: "all .2s",
              }}
            >
              {loading ? "Sending…" : "Send OTP"}
            </button>
          </>
        ) : (
          <>
            <div style={{ color: WHITE, fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
              Verify OTP
            </div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>
              Code sent to <span style={{ color: PINK }}>+91 {phone}</span>
              {name && <span style={{ color: "#666" }}> ({name})</span>}
            </div>

            {/* OTP inputs */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              {otp.map((v, i) => (
                <input
                  key={i}
                  ref={refs[i]}
                  value={v}
                  maxLength={1}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKey(i, e)}
                  style={{
                    width: 46, height: 54, textAlign: "center",
                    border: `2px solid ${v ? PINK : "#2a2a3e"}`,
                    borderRadius: 12, background: "#16162a", color: WHITE,
                    fontSize: 22, fontWeight: 700, outline: "none",
                  }}
                />
              ))}
            </div>

            {/* Resend timer */}
            <div style={{ textAlign: "center", color: "#666", fontSize: 13, marginBottom: 24 }}>
              {timer > 0 ? (
                <>Resend in <span style={{ color: PINK, fontWeight: 700 }}>{mm}:{ss}</span></>
              ) : (
                <span
                  onClick={handleResend}
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
                width: "100%", padding: "14px", borderRadius: 30, border: "none",
                background: loading ? "#555" : PINK, color: WHITE,
                fontWeight: 800, fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Verifying…" : "Verify & Login"}
            </button>

            <div
              onClick={() => {
                setStep("phone");
                setOtp(Array(6).fill(""));
                window.confirmationResult = null;
              }}
              style={{ textAlign: "center", color: PINK, marginTop: 14, cursor: "pointer", fontSize: 13 }}
            >
              ← Change account
            </div>
          </>
        )}
      </div>

      {/* Required for Firebase recaptcha */}
      <div
        id="recaptcha-box"
        style={{ position: "fixed", bottom: 0, left: 0, opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
}