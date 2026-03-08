import React, { useRef, useState, useEffect } from "react";
import { useSignIn, useAuth } from "@clerk/clerk-react";
import { useRouter } from "expo-router";
import "../../styles/web.css";

import backgroundImageSource from "../../assets/background.png";

type Step = "email" | "password" | "otp";

export default function SignInWeb() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  // Already signed in — go straight to app
  useEffect(() => {
    if (isSignedIn) router.replace("/(app)");
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

  const getImageUrl = (img: any): string => {
    if (typeof img === "string") return img;
    if (img && typeof img === "object" && img.default) return img.default;
    if (img && typeof img === "object" && img.uri) return img.uri;
    return "";
  };
  const bgImageUrl = getImageUrl(backgroundImageSource);

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

  const handleContinueEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setError("");
      setStep("password");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
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
        router.replace("/(app)");
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
        // Already authenticated — just navigate to the app
        router.replace("/(app)");
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
        router.replace("/(app)");
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
    <div className="auth-split-page">
      {/* Left Side - Branding */}
      <div
        className="auth-brand-side"
        style={{
          backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            <div className="auth-logo-box">
              <span className="auth-logo-letter">T</span>
            </div>
          </div>
          <h1 className="auth-brand-title">TELEBA</h1>
          <p className="auth-brand-tagline">
            Your trusted financial management partner
          </p>
        </div>
      </div>

      {/* Right Side */}
      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-form-card">
            <div className="auth-form-header">
              <h2 className="auth-form-title">Welcome</h2>
              <p className="auth-form-subtitle">
                Login to your account to continue
              </p>
            </div>

            {/* ── Email Step ── */}
            {step === "email" && (
              <form onSubmit={handleContinueEmail}>
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <label className="clerk-label-split">Email address</label>
                  </div>
                  <input
                    className="clerk-input-split"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    autoFocus
                  />
                </div>
                {error && <p style={errorStyle}>{error}</p>}
                <button
                  type="submit"
                  className="clerk-primary-button-split"
                  disabled={!email.trim()}
                >
                  Continue <span style={{ marginLeft: "6px" }}>›</span>
                </button>
                <p style={footerStyle}>
                  Don't have an account?{" "}
                  <a href="/sign-up" className="clerk-link">
                    Sign up
                  </a>
                </p>
              </form>
            )}

            {/* ── Password Step ── */}
            {step === "password" && (
              <form onSubmit={handleSignIn}>
                {/* Email display with edit */}
                <div style={emailRowStyle}>
                  <span style={{ fontSize: "14px", color: "#374151" }}>
                    {email}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setSecondFactorPrepared(false);
                      setError("");
                    }}
                    style={editBtnStyle}
                    title="Edit email"
                  >
                    ✎
                  </button>
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
                      autoFocus
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
                  disabled={loading || !password}
                >
                  {loading ? (
                    "Signing in…"
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
                      setStep("email");
                      setSecondFactorPrepared(false);
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

            {/* ── OTP Step ── */}
            {step === "otp" && (
              <form onSubmit={handleVerify}>
                {/* Email display */}
                <div
                  style={{
                    ...emailRowStyle,
                    justifyContent: "center",
                    marginBottom: "20px",
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
                  You're signing in from a new device. We're asking for
                  verification to keep your account secure.
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
        </div>
      </div>
    </div>
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

const emailRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "16px",
  padding: "8px 12px",
  background: "#f9fafb",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
};

const editBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#dc2626",
  fontSize: "16px",
  padding: "0",
  lineHeight: 1,
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
