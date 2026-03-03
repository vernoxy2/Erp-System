import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import logotext from "../../assets/logotext.svg";
import logocrown from "../../assets/logocrown.svg";
import factoryImg from "../../assets/image.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";

// Inject keyframes into the document head once
const injectStyles = () => {
  if (document.getElementById("login-animations")) return;
  const style = document.createElement("style");
  style.id = "login-animations";
  style.textContent = `
    @keyframes zoomInOut {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.12); }
      100% { transform: scale(1); }
    }
    @keyframes rotateCW {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [mounted, setMounted] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    injectStyles();
    setTimeout(() => setMounted(true), 80);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your User ID and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "user", result.user.uid));
      const data = userDoc.data();
      if (!data) throw new Error("No user record found.");
      if (data.role === "admin") {
        navigate("/admin");
      } else if (data.role === "user") {
        const dept = data.department;
        if (dept === "warehouse") navigate("/store/dashboard");
        else if (dept === "sales") navigate("/sales/dashboard");
        else if (dept === "accounts") navigate("/accounts/dashboard");
        else setError(`Unknown department: "${dept}". Contact admin.`);
      } else {
        setError(`Unknown role: "${data.role}". Contact admin.`);
      }
    } catch (err) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      )
        setError("Invalid User ID or password.");
      else if (err.code === "auth/wrong-password")
        setError("Incorrect password.");
      else if (err.code === "auth/invalid-email")
        setError("Please enter a valid email.");
      else if (err.code === "auth/too-many-requests")
        setError("Too many attempts. Try again later.");
      else setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!resetEmail) {
      setResetError("Please enter your email address.");
      return;
    }
    setResetLoading(true);
    setResetError("");
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch {
      setResetError("Could not send reset email. Please check the address.");
    } finally {
      setResetLoading(false);
    }
  };

  const goBack = () => {
    setForgotMode(false);
    setResetSent(false);
    setResetError("");
    setResetEmail("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div
        className={`w-[92%] max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="grid grid-cols-12 min-h-[720px]">
          {/* ══ LEFT — Form (5/12) ══ */}
          <div className="col-span-5 px-14 py-12 flex flex-col justify-center relative">
            {/* Decorative circuit SVG */}
            <svg
              className="absolute bottom-0 left-0 w-full opacity-30 z-[-1]"
              viewBox="0 0 400 180"
              fill="none"
            >
              <path
                d="M0 140 L60 140 L60 100 L120 100 L120 140 L200 140"
                stroke="#6366f1"
                strokeWidth="1.5"
              />
              <path
                d="M100 180 L100 120 L160 120 L160 80 L240 80"
                stroke="#f97316"
                strokeWidth="1.5"
              />
              <path
                d="M200 160 L260 160 L260 110 L320 110 L320 150 L400 150"
                stroke="#6366f1"
                strokeWidth="1.5"
              />
              <circle cx="60" cy="140" r="3" fill="#6366f1" />
              <circle cx="120" cy="100" r="3" fill="#6366f1" />
              <circle cx="160" cy="120" r="3" fill="#f97316" />
              <circle cx="260" cy="160" r="3" fill="#6366f1" />
              <circle cx="320" cy="110" r="3" fill="#6366f1" />
            </svg>

            {!forgotMode ? (
              <>
                <h2 className="text-[#311F85] font-extrabold text-5xl leading-tight">
                  Log In
                </h2>

                <p className="text-lg text-gray-500 mt-3 max-w-md">
                  Secure industrial portal login for managing products,
                  services, and operations.
                </p>

                {error && (
                  <div className="mt-6 rounded-lg bg-red-50 text-red-600 px-4 py-3 text-sm font-medium">
                    ⚠ {error}
                  </div>
                )}

                <div className="mt-12">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    User ID
                  </label>
                  <input
                    className="w-full rounded-xl bg-[#F2F2F2] border border-gray-300 px-4 py-3 text-base focus:ring-1 focus:ring-orange-500 outline-none"
                    type="email"
                    placeholder="user@fit2feb.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      className="w-full rounded-xl border border-gray-300 bg-[#F2F2F2] px-4 py-3 pr-12 text-base focus:ring-1 focus:ring-orange-500 outline-none"
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                      onClick={() => setShowPass(!showPass)}
                    >
                      {showPass ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>

                  <button
                    className="mt-3 w-full text-right text-sm font-medium text-[#818181] underline"
                    onClick={() => {
                      setForgotMode(true);
                      setError("");
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  className="mt-6 w-full rounded-xl bg-[#311F85] text-white py-3 text-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-70"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Log in"}
                </button>
              </>
            ) : (
              /* ── Forgot Password Panel ── */
              <div className="flex flex-col">
                <button
                  onClick={goBack}
                  className="self-start text-sm text-gray-500 hover:text-gray-800 mb-8 flex items-center gap-1"
                >
                  ← Back to Login
                </button>

                {resetSent ? (
                  <>
                    <h2 className="text-[#311F85] font-extrabold text-4xl leading-tight">
                      Email Sent!
                    </h2>
                    <p className="text-gray-500 mt-4">
                      A password reset link has been sent to{" "}
                      <strong>{resetEmail}</strong>. Check your inbox.
                    </p>
                    <button
                      onClick={goBack}
                      className="mt-8 w-full rounded-xl bg-[#311F85] text-white py-3 text-lg font-semibold hover:bg-indigo-700 transition"
                    >
                      Back to Login
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-[#311F85] font-extrabold text-4xl leading-tight">
                      Reset Password
                    </h2>
                    <p className="text-gray-500 mt-3">
                      Enter your registered email and we'll send you a reset
                      link.
                    </p>

                    {resetError && (
                      <div className="mt-6 rounded-lg bg-red-50 text-red-600 px-4 py-3 text-sm font-medium">
                        ⚠ {resetError}
                      </div>
                    )}

                    <div className="mt-8">
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Email Address
                      </label>
                      <input
                        className="w-full rounded-xl bg-[#F2F2F2] border border-gray-300 px-4 py-3 text-base focus:ring-1 focus:ring-orange-500 outline-none"
                        type="email"
                        placeholder="user@fit2fab.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleReset()}
                      />
                    </div>

                    <button
                      className="mt-6 w-full rounded-xl bg-[#311F85] text-white py-3 text-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-70"
                      onClick={handleReset}
                      disabled={resetLoading}
                    >
                      {resetLoading ? "Sending..." : "Send Reset Link"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ══ RIGHT — Image Panel (7/12) ══ */}
          <div className="col-span-7 relative bg-gradient-to-br flex flex-col overflow-hidden">
            {/* Logo — clockwise rotation, positioned at top-center */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10">
              <img
             src={logocrown}
                alt="Fib2Fab"
                className="h-30"
                style={{
                  // animation: "rotateCW 8s linear infinite",
                  transformOrigin: "center center",
                }}
              />
              <img
             src={logotext}
                alt="Fib2Fab"
                className="h-30 -mt-7"
                style={{
                  // animation: "rotateCW 8s linear infinite",
                  transformOrigin: "center center",
                }}
              />
            </div>

            {/* Factory Image — zoom in/out, clipped inside panel */}
            <div className="mt-auto h-full overflow-hidden">
              <img
                src={factoryImg}
                alt="Industrial Factory"
                className="w-full h-full object-cover"
                style={{
                  animation: "zoomInOut 15s ease-in-out infinite",
                  transformOrigin: "center center",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}