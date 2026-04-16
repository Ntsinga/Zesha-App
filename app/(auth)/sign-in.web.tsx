import React, { useRef, useState, useEffect } from "react";
import { useSignIn, useAuth } from "@clerk/clerk-react";
import { useRouter } from "expo-router";
import "../../styles/web.css";
import AuthBrandPanel from "../../components/AuthBrandPanel.web";

type Step = "email" | "password" | "otp";

export default function SignInWeb() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const getRedirectTarget = () => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    return redirect && redirect.startsWith("/") ? redirect : "/(app)";
  };

  // Already signed in — go straight to intended page (or app)
  useEffect(() => {
    if (isSignedIn) router.replace(getRedirectTarget());
  }, [isSignedIn]);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [secondFactorPrepared, setSecondFactorPrepared] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const emailRef = useRef<HTMLInputElement>(null);

  // Auto-focus email on mount only — not on every re-render
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }
    if (secondFactorPrepared) {
      setStep("otp");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const attempt = await signIn.create({ identifier: email, password });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace(getRedirectTarget());
      } else if (attempt.status === "needs_second_factor") {
        // Custom form: call prepareSecondFactor once ourselves (no Clerk component to double-trigger it)
        await signIn.prepareSecondFactor({ strategy: "email_code" });
        setSecondFactorPrepared(true);
        setStep("otp");
      } else {
        setError("Sign in failed. Please try again.");
      }
    } catch (err: any) {
      const msg: string = err.errors?.[0]?.message ?? err.message ?? "";
      if (msg.toLowerCase().includes("session already exists")) {
        // Already authenticated — just navigate to the intended page
        router.replace(getRedirectTarget());
        return;
      }
      setError(msg || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    const code = otp.join("");
    if (code.length < 6) return;
    setLoading(true);
    setError("");
    try {
      const attempt = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code,
      });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace(getRedirectTarget());
      } else {
        setError("Verification failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Incorrect code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!isLoaded || !signIn) return;
    try {
      await signIn.prepareSecondFactor({ strategy: "email_code" });
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      setError("");
    } catch {
      setError("Failed to resend code.");
    }
  };

  return (
    <AuthBrandPanel>
      <div className="auth-centered-card">
        <div className="auth-form-header">
          <h2 className="auth-form-title">Welcome back</h2>
          <p className="auth-form-subtitle">Sign in to your Teleba account</p>
        </div>

        {/* ── Combined Email + Password Step ── */}
        {(step === "email" || step === "password") && (
          <form onSubmit={handleSignIn}>
            <div style={{ marginBottom: "16px" }}>
              <label
                className="clerk-label-split"
                style={{ display: "block", marginBottom: "10px" }}
              >
                Email address
              </label>
              <input
                ref={emailRef}
                className="clerk-input-split"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <label className="clerk-label-split">Password</label>
                <a
                  href="/forgot-password"
                  className="clerk-link"
                  style={{ fontSize: "13px" }}
                >
                  Forgot password?
                </a>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  className="clerk-input-split"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{ paddingRight: "48px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="clerk-password-button"
                  style={eyeBtnStyle}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            {error && <p style={errorStyle}>{error}</p>}
            <button
              type="submit"
              className="clerk-primary-button-split"
              disabled={loading || !email.trim() || !password}
            >
              {loading ? (
                "Signing in…"
              ) : (
                <>
                  Sign In <span style={{ marginLeft: "6px" }}>›</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ── OTP Step ── */}
        {step === "otp" && (
          <form onSubmit={handleVerify}>
            {/* Email display */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginBottom: "20px",
                padding: "8px 12px",
                background: "#f9fafb",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
            >
              <span style={{ fontSize: "14px", color: "#374151" }}>
                {email}
              </span>
            </div>

            {/* 6 individual digit boxes */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "center",
                marginBottom: "8px",
              }}
            >
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  className="clerk-input-split"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  autoFocus={i === 0}
                  style={{
                    width: "44px",
                    height: "44px",
                    textAlign: "center",
                    fontSize: "18px",
                    fontWeight: "600",
                    padding: "0",
                  }}
                />
              ))}
            </div>

            <p
              style={{
                textAlign: "center",
                fontSize: "13px",
                color: "#6b7280",
                marginBottom: "16px",
              }}
            >
              Didn't receive a code?{" "}
              <button
                type="button"
                onClick={handleResend}
                className="clerk-link"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Resend
              </button>
            </p>

            <div
              style={{
                background: "#fef3c7",
                border: "1px solid #f59e0b",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "#92400e",
                textAlign: "center",
              }}
            >
              You're signing in from a new device. We're asking for verification
              to keep your account secure.
            </div>

            {error && <p style={errorStyle}>{error}</p>}

            <button
              type="submit"
              className="clerk-primary-button-split"
              disabled={loading || otp.join("").length < 6}
            >
              {loading ? (
                "Verifying…"
              ) : (
                <>
                  {" "}
                  Continue <span style={{ marginLeft: "6px" }}>›</span>
                </>
              )}
            </button>

            <p style={{ ...footerStyle, marginTop: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  setStep("password");
                  setOtp(["", "", "", "", "", ""]);
                  setError("");
                }}
                className="clerk-link"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Use another method
              </button>
            </p>
          </form>
        )}
      </div>
      <p className="auth-centered-copyright">
        &copy; {new Date().getFullYear()} Teleba. All rights reserved.
      </p>
    </AuthBrandPanel>
  );
}

const errorStyle: React.CSSProperties = {
  color: "#dc2626",
  fontSize: "13px",
  marginBottom: "12px",
  textAlign: "center",
};

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: "13px",
  color: "#6b7280",
  marginTop: "16px",
  marginBottom: 0,
};

const eyeBtnStyle: React.CSSProperties = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "16px",
  lineHeight: 1,
};
