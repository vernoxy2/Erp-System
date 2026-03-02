import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.svg";
import factoryImg from "../../assets/image.png";

export default function Login() {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPass, setShowPass]         = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [forgotMode, setForgotMode]     = useState(false);
  const [resetEmail, setResetEmail]     = useState("");
  const [resetSent, setResetSent]       = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError]     = useState("");
  const [mounted, setMounted]           = useState(false);

  const navigate = useNavigate();

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter your User ID and password."); return; }
    setLoading(true); setError("");
    try {
      const result  = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "user", result.user.uid));
      const data    = userDoc.data();
      if (!data) throw new Error("No user record found.");
      if (data.role === "admin") {
        navigate("/admin");
      } else if (data.role === "user") {
        const dept = data.department;
        if      (dept === "warehouse") navigate("/store/dashboard");
        else if (dept === "sales")     navigate("/sales/dashboard");
        else if (dept === "accounts")  navigate("/accounts/dashboard");
        else setError(`Unknown department: "${dept}". Contact admin.`);
      } else {
        setError(`Unknown role: "${data.role}". Contact admin.`);
      }
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential")
        setError("Invalid User ID or password.");
      else if (err.code === "auth/wrong-password")    setError("Incorrect password.");
      else if (err.code === "auth/invalid-email")     setError("Please enter a valid email.");
      else if (err.code === "auth/too-many-requests") setError("Too many attempts. Try again later.");
      else setError(err.message || "Login failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!resetEmail) { setResetError("Please enter your email address."); return; }
    setResetLoading(true); setResetError("");
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch {
      setResetError("Could not send reset email. Please check the address.");
    } finally { setResetLoading(false); }
  };

  const goBack = () => {
    setForgotMode(false); setResetSent(false);
    setResetError(""); setResetEmail("");
  };

  return (
    <div className="f2f-root">
      <div className={`f2f-card ${mounted ? "show" : ""}`}>

        {/* ══ LEFT — Form ══ */}
        <div className="f2f-left">
          <svg className="f2f-circuit" viewBox="0 0 400 180" fill="none">
            <path d="M0 140 L60 140 L60 100 L120 100 L120 140 L200 140" stroke="#6366f1" strokeWidth="1.5"/>
            <path d="M100 180 L100 120 L160 120 L160 80 L240 80" stroke="#f97316" strokeWidth="1.5"/>
            <path d="M200 160 L260 160 L260 110 L320 110 L320 150 L400 150" stroke="#6366f1" strokeWidth="1.5"/>
            <circle cx="60"  cy="140" r="3" fill="#6366f1"/>
            <circle cx="120" cy="100" r="3" fill="#6366f1"/>
            <circle cx="160" cy="120" r="3" fill="#f97316"/>
            <circle cx="260" cy="160" r="3" fill="#6366f1"/>
            <circle cx="320" cy="110" r="3" fill="#6366f1"/>
          </svg>

          {forgotMode ? (
            <>
              <button className="f2f-back-btn" onClick={goBack}>← Back to login</button>
              {resetSent ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b", marginBottom: 8 }}>Check your inbox</h3>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 24 }}>
                    Reset link sent to <strong style={{ color: "#1e293b" }}>{resetEmail}</strong>.<br />
                    Follow the instructions in the email.
                  </p>
                  <button className="f2f-btn" onClick={goBack}>Back to Sign In</button>
                </div>
              ) : (
                <>
                  <h2 className="f2f-title" style={{ fontSize: 26 }}>Forgot Password?</h2>
                  <p className="f2f-subtitle">Enter your registered email and we'll send you a secure reset link.</p>
                  {resetError && <div className="f2f-error">⚠ {resetError}</div>}
                  <div className="f2f-field">
                    <label className="f2f-label">Email Address</label>
                    <input className="f2f-input" type="email" placeholder="you@company.com"
                      value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleReset()} />
                  </div>
                  <button className="f2f-btn" onClick={handleReset} disabled={resetLoading}>
                    {resetLoading ? <span className="f2f-spinner" /> : "Send Reset Link →"}
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <h2 className="f2f-title">Log In</h2>
              <p className="f2f-subtitle">
                Secure industrial portal login for managing products, services, and operations.
              </p>
              {error && <div className="f2f-error">⚠ {error}</div>}
              <div className="f2f-field">
                <label className="f2f-label">User ID</label>
                <input className="f2f-input" type="email" placeholder="user@fit2feb.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
              </div>
              <div className="f2f-field">
                <label className="f2f-label">Password</label>
                <div className="f2f-input-wrap">
                  <input className="f2f-input" type={showPass ? "text" : "password"}
                    placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    style={{ paddingRight: 40 }} />
                  <button className="f2f-eye" type="button" onClick={() => setShowPass(!showPass)}>
                    {showPass ? "🙈" : "👁"}
                  </button>
                </div>
                <button className="f2f-forgot" onClick={() => { setForgotMode(true); setError(""); }}>
                  Forgot password ?
                </button>
              </div>
              <button className="f2f-btn" onClick={handleLogin} disabled={loading}>
                {loading ? <><span className="f2f-spinner" /> Signing in...</> : "Log in"}
              </button>
            </>
          )}
        </div>

        {/* ══ RIGHT — Full image panel ══ */}
        <div className="f2f-right">
          {/* Logo centered at top */}
          <div className="f2f-right-logo">
            <img src={logo} alt="Fib2Fab" />
          </div>

          {/* Factory image fills the bottom */}
          <div className="f2f-right-image">
            <img src={factoryImg} alt="Industrial Factory" />
          </div>
        </div>

      </div>
    </div>
  );
}