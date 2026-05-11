import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../hooks/useAuth.js";
import TopBar from "../components/TopBar.jsx";
import PinkBtn from "../components/PinkBtn.jsx";
import { pink } from "../components/theme.js";
import toast from "react-hot-toast";

export default function OTPPage() {
  const nav = useNavigate();
  const { login } = useAuth();
  const phone = sessionStorage.getItem("otpPhone") || "";
  const name = sessionStorage.getItem("otpName") || "";
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(120);
  const refs = Array.from({ length: 6 }, () => useRef(null));

  useEffect(() => {
    // Auto focus first input
    refs[0].current?.focus();

    // Countdown timer
    const id = setInterval(() => setTimer((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const handleChange = (i, val) => {
    if (!/^[0-9]?$/.test(val)) return;
    const n = [...otp];
    n[i] = val;
    setOtp(n);
    if (val && i < 5) refs[i + 1].current?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0)
      refs[i - 1].current?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) return toast.error("Enter 6-digit OTP");

    // ✅ Check confirmationResult exists
    if (!window.confirmationResult) {
      toast.error("Session expired. Please go back and try again.");
      nav("/login");
      return;
    }

    try {
      setLoading(true);

      // ✅ Step 1: Verify OTP with Firebase directly
      const result = await window.confirmationResult.confirm(code);
      const firebaseToken = await result.user.getIdToken();

      // ✅ Step 2: Send Firebase token to your backend
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/firebase-verify`,
        { firebaseToken, name }
      );

      // ✅ Step 3: Login with your app JWT
      login(data);
      sessionStorage.removeItem("otpPhone");
      sessionStorage.removeItem("otpName");
      window.confirmationResult = null;
      nav("/menu");
      toast.success("Welcome to Adda Cafe! 🎉");
    } catch (e) {
      console.error("Verify Error:", e.code, e.message);
      if (e.code === "auth/invalid-verification-code") {
        toast.error("Wrong OTP. Please check and try again.");
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
    // Go back to login to re-trigger Firebase OTP
    sessionStorage.removeItem("otpPhone");
    sessionStorage.removeItem("otpName");
    window.confirmationResult = null;
    nav("/login");
    toast("Re-enter your number to resend OTP", { icon: "📱" });
  };

  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopBar title="Verify OTP" back />
      <div
        style={{
          flex: 1,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          alignItems: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>📱</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
            Enter Verification Code
          </div>
          <div style={{ color: "#888", fontSize: 13 }}>
            We sent a 6-digit code to
          </div>
          <div style={{ color: pink, fontWeight: 700, fontSize: 14 }}>
            +91 {phone}
          </div>
        </div>

        {/* OTP Input Boxes */}
        <div style={{ display: "flex", gap: 10 }}>
          {otp.map((v, i) => (
            <input
              key={i}
              ref={refs[i]}
              value={v}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              style={{
                width: 44,
                height: 52,
                textAlign: "center",
                border: `2.5px solid ${v ? pink : "#ddd"}`,
                borderRadius: 12,
                fontSize: 22,
                fontWeight: 700,
                outline: "none",
                transition: "border-color .2s",
              }}
            />
          ))}
        </div>

        {/* Timer / Resend */}
        <div style={{ textAlign: "center", fontSize: 13 }}>
          {timer > 0 ? (
            <span style={{ color: "#888" }}>
              Resend in{" "}
              <span style={{ color: pink, fontWeight: 700 }}>
                {mm}:{ss}
              </span>
            </span>
          ) : (
            <span
              onClick={handleResend}
              style={{ color: pink, cursor: "pointer", fontWeight: 700 }}
            >
              Resend OTP
            </span>
          )}
        </div>

        <div style={{ width: "100%" }}>
          <PinkBtn onClick={handleVerify} disabled={loading}>
            {loading ? "Verifying…" : "Verify & Continue"}
          </PinkBtn>
        </div>
      </div>
    </div>
  );
}