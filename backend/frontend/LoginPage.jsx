// import { useNavigate } from "react-router-dom";
// import { auth } from "../services/firebase.js";
// import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
// import { useState } from "react";
// import TopBar from "../components/TopBar.jsx";
// import { pink } from "../components/theme.js";
// import PinkBtn from "../components/PinkBtn.jsx";
// import { useAuth } from "../hooks/useAuth.js";
// import toast from "react-hot-toast";

// let currentVerifier = null;

// export default function LoginPage() {
//   const nav = useNavigate();
//   const { loginAsGuest } = useAuth();
//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handle = async () => {
//     if (!phone || phone.length < 10)
//       return toast.error("Enter valid 10-digit phone number");

//     try {
//       setLoading(true);

//       // ✅ Always clear previous verifier
//       if (currentVerifier) {
//         try { currentVerifier.clear(); } catch (_) {}
//         currentVerifier = null;
//       }
//       const box = document.getElementById("recaptcha-box");
//       if (box) box.innerHTML = "";

//       // ✅ Create fresh verifier
//       currentVerifier = new RecaptchaVerifier(auth, "recaptcha-box", {
//         size: "invisible",
//       });

//       // ✅ Render before use
//       await currentVerifier.render();

//       // ✅ Send OTP
//       const confirmationResult = await signInWithPhoneNumber(
//         auth,
//         `+91${phone}`,
//         currentVerifier
//       );

//       window.confirmationResult = confirmationResult;
//       sessionStorage.setItem("otpPhone", phone);
//       sessionStorage.setItem("otpName", name);
//       nav("/otp");

//     } catch (e) {
//       console.error("OTP Error:", e.code, e.message);
//       if (currentVerifier) {
//         try { currentVerifier.clear(); } catch (_) {}
//         currentVerifier = null;
//       }
//       const box = document.getElementById("recaptcha-box");
//       if (box) box.innerHTML = "";

//       if (e.code === "auth/too-many-requests") {
//         toast.error("Too many attempts. Please wait.");
//       } else if (e.code === "auth/invalid-phone-number") {
//         toast.error("Invalid phone number.");
//       } else {
//         toast.error(e.message || "Failed to send OTP.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSkip = () => {
//     loginAsGuest();
//     nav("/menu");
//     toast("Browsing as Guest 👋", { icon: "🛍️" });
//   };

//   return (
//     <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
//       <TopBar
//         title="Login Account"
//         right={
//           <span onClick={handleSkip} style={{ color: pink, cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "4px 8px" }}>
//             Skip
//           </span>
//         }
//       />

//       <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 22 }}>

//         <div style={{ textAlign: "center", marginBottom: 6 }}>
//           <div style={{ width: 88, height: 88, background: "#f0f0f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontSize: 42 }}>
//             👤
//           </div>
//           <div style={{ color: "#888", fontSize: 13 }}>Enter your details to continue</div>
//         </div>

//         <Field label="Your Name" value={name} onChange={setName} placeholder="Enter Your Name" />

//         <div>
//           <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6, fontWeight: 600 }}>
//             Phone Number
//           </label>
//           <div style={{ display: "flex", gap: 8 }}>
//             <div style={{ padding: "12px 14px", border: "1px solid #ddd", borderRadius: 12, background: "#f9f9f9", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
//               🇮🏳 <span style={{ color: "#555" }}>+91</span>
//             </div>
//             <input
//               value={phone}
//               onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
//               maxLength={10}
//               placeholder="123 456 7890"
//               type="tel"
//               style={{ flex: 1, padding: "12px 14px", border: "1px solid #ddd", borderRadius: 12, fontSize: 14, boxSizing: "border-box", outline: "none" }}
//             />
//           </div>
//         </div>

//         <PinkBtn onClick={handle} disabled={loading}>
//           {loading ? "Sending OTP…" : "Next & Verify Phone Number"}
//         </PinkBtn>

//         <div style={{ textAlign: "center", color: "#aaa", fontSize: 12 }}>— or —</div>

//         <button
//           onClick={handleSkip}
//           style={{ width: "100%", padding: "12px 0", border: "1.5px dashed #ddd", borderRadius: 25, background: "transparent", color: "#888", fontSize: 14, cursor: "pointer", fontWeight: 600 }}
//         >
//           Continue as Guest 👋
//         </button>
//       </div>

//       {/* ✅ Hidden stable div */}
//       <div id="recaptcha-box" style={{ position: "fixed", bottom: 0, left: 0, opacity: 0, pointerEvents: "none" }} />
//     </div>
//   );
// }

// const Field = ({ label, value, onChange, placeholder }) => (
//   <div>
//     <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6, fontWeight: 600 }}>
//       {label}
//     </label>
//     <input
//       value={value}
//       onChange={(e) => onChange(e.target.value)}
//       placeholder={placeholder}
//       style={{ width: "100%", padding: "12px 14px", border: "1px solid #ddd", borderRadius: 12, fontSize: 14, boxSizing: "border-box", outline: "none" }}
//     />
//   </div>
// );

import { useNavigate } from "react-router-dom";
import { auth } from "../services/firebase.js";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useState, useEffect } from "react";
import TopBar from "../components/TopBar.jsx";
import { pink } from "../components/theme.js";
import PinkBtn from "../components/PinkBtn.jsx";
import { useAuth } from "../hooks/useAuth.js";
import toast from "react-hot-toast";

let currentVerifier = null;

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function LoginPage() {
  const nav = useNavigate();
  const { loginAsGuest } = useAuth();
  const [chefs, setChefs] = useState([]);
  const [selectedChef, setSelectedChef] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // ✅ Fetch active chefs on mount
  useEffect(() => {
    const fetchChefs = async () => {
      try {
        setFetching(true);
        const res = await fetch(`${API_BASE}/admin/chefs?status=Active`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.chefs || [];
        // Only active chefs
        setChefs(list.filter((c) => c.status === "Active"));
      } catch (err) {
        toast.error("Could not load chef list. Try again.");
      } finally {
        setFetching(false);
      }
    };
    fetchChefs();
  }, []);

  const handle = async () => {
    if (!selectedChef) return toast.error("Please select your name from the list");

    try {
      setLoading(true);

      if (currentVerifier) {
        try { currentVerifier.clear(); } catch (_) {}
        currentVerifier = null;
      }
      const box = document.getElementById("recaptcha-box");
      if (box) box.innerHTML = "";

      currentVerifier = new RecaptchaVerifier(auth, "recaptcha-box", {
        size: "invisible",
      });
      await currentVerifier.render();

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        `+91${selectedChef.phone}`,
        currentVerifier
      );

      window.confirmationResult = confirmationResult;
      sessionStorage.setItem("otpPhone", selectedChef.phone);
      sessionStorage.setItem("otpName", selectedChef.name);
      nav("/otp");

    } catch (e) {
      console.error("OTP Error:", e.code, e.message);
      if (currentVerifier) {
        try { currentVerifier.clear(); } catch (_) {}
        currentVerifier = null;
      }
      const box = document.getElementById("recaptcha-box");
      if (box) box.innerHTML = "";

      if (e.code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please wait.");
      } else if (e.code === "auth/invalid-phone-number") {
        toast.error("Invalid phone number.");
      } else {
        toast.error(e.message || "Failed to send OTP.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    loginAsGuest();
    nav("/menu");
    toast("Browsing as Guest 👋", { icon: "🛍️" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#fff" }}>
      <TopBar
        title="Login Account"
        right={
          <span onClick={handleSkip} style={{ color: pink, cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "4px 8px" }}>
            Skip
          </span>
        }
      />

      <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 22 }}>

        {/* Avatar */}
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ width: 88, height: 88, background: "#f0f0f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontSize: 42 }}>
            👨‍🍳
          </div>
          <div style={{ fontWeight: 700, fontSize: 17, color: "#222" }}>Who are you?</div>
          <div style={{ color: "#888", fontSize: 13, marginTop: 4 }}>Select your name to receive OTP</div>
        </div>

        {/* ✅ Custom Dropdown */}
        <div>
          <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6, fontWeight: 600 }}>
            Select Your Name
          </label>

          {fetching ? (
            <div style={{ padding: "14px", border: "1px solid #eee", borderRadius: 12, color: "#aaa", fontSize: 14, textAlign: "center" }}>
              Loading chefs…
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              {/* Dropdown Trigger */}
              <div
                onClick={() => setDropdownOpen((prev) => !prev)}
                style={{
                  padding: "13px 16px",
                  border: `1.5px solid ${selectedChef ? pink : "#ddd"}`,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  background: selectedChef ? "#fff5f8" : "#fafafa",
                  transition: "all 0.2s",
                }}
              >
                {selectedChef ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: pink, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15 }}>
                      {selectedChef.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#222" }}>{selectedChef.name}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>+91 {selectedChef.phone}</div>
                    </div>
                  </div>
                ) : (
                  <span style={{ color: "#bbb", fontSize: 14 }}>Choose your name…</span>
                )}
                <span style={{ fontSize: 12, color: "#999", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
              </div>

              {/* Dropdown List */}
              {dropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1.5px solid #eee",
                  borderRadius: 14,
                  boxShadow: "0 8px 30px rgba(0,0,0,0.10)",
                  zIndex: 100,
                  overflow: "hidden",
                }}>
                  {chefs.length === 0 ? (
                    <div style={{ padding: 16, color: "#aaa", fontSize: 14, textAlign: "center" }}>
                      No active chefs found
                    </div>
                  ) : (
                    chefs.map((chef, i) => (
                      <div
                        key={chef._id}
                        onClick={() => {
                          setSelectedChef(chef);
                          setDropdownOpen(false);
                        }}
                        style={{
                          padding: "12px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          cursor: "pointer",
                          borderBottom: i < chefs.length - 1 ? "1px solid #f5f5f5" : "none",
                          background: selectedChef?._id === chef._id ? "#fff5f8" : "#fff",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#fff5f8"}
                        onMouseLeave={(e) => e.currentTarget.style.background = selectedChef?._id === chef._id ? "#fff5f8" : "#fff"}
                      >
                        {/* Avatar circle with initial */}
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: pink, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                          {chef.name[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#222" }}>{chef.name}</div>
                          <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>+91 {chef.phone}</div>
                        </div>
                        {selectedChef?._id === chef._id && (
                          <span style={{ color: pink, fontSize: 16 }}>✓</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected info card */}
        {selectedChef && (
          <div style={{ background: "#fff5f8", border: `1px solid ${pink}22`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>📱</span>
            <div>
              <div style={{ fontSize: 12, color: "#888" }}>OTP will be sent to</div>
              <div style={{ fontWeight: 700, color: "#222", fontSize: 14 }}>+91 {selectedChef.phone}</div>
            </div>
          </div>
        )}

        <PinkBtn onClick={handle} disabled={loading || !selectedChef || fetching}>
          {loading ? "Sending OTP…" : "Send OTP"}
        </PinkBtn>

        <div style={{ textAlign: "center", color: "#aaa", fontSize: 12 }}>— or —</div>

        <button
          onClick={handleSkip}
          style={{ width: "100%", padding: "12px 0", border: "1.5px dashed #ddd", borderRadius: 25, background: "transparent", color: "#888", fontSize: 14, cursor: "pointer", fontWeight: 600 }}
        >
          Continue as Guest 👋
        </button>
      </div>

      <div id="recaptcha-box" style={{ position: "fixed", bottom: 0, left: 0, opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}