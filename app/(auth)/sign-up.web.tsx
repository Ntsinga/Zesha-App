import React, { useRef, useState } from "react";
import { useSignUp } from "@clerk/clerk-react";
import { useRouter } from "expo-router";
import "../../styles/web.css";
import AuthBrandPanel from "../../components/AuthBrandPanel.web";

type Step = "form" | "otp";

export default function SignUpWeb() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("otp");
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    const code = otp.join("");
    if (code.length < 6) return;
    setLoading(true);
    setError("");
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
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
    if (!isLoaded || !signUp) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      setError("");
    } catch {
      setError("Failed to resend code.");
    }
  };

  return (
    <div className="auth-split-page">
      <AuthBrandPanel />
      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Create Account</h2>
            <p className="auth-form-subtitle">
              Sign up to get started with Teleba
            </p>
          </div>

          <div className="auth-form-card">
            {step === "form" && (
              <form onSubmit={handleSignUp}>
                {/* First + Last Name row */}
                <div
                  style={{ display: "flex", gap: "16px", marginBottom: "16px" }}
                >
                  <div style={{ flex: 1 }}>
                    <label className="clerk-label-split">First name</label>
                    <input
                      className="clerk-input-split"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      required
                      autoFocus
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="clerk-label-split">Last name</label>
                    <input
                      className="clerk-input-split"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label className="clerk-label-split">Email address</label>
                  <input
                    className="clerk-input-split"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label className="clerk-label-split">Password</label>
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

                <div style={{ marginBottom: "24px" }}>
                  <label className="clerk-label-split">Confirm password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="clerk-input-split"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required
                      style={{ paddingRight: "48px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="clerk-password-button"
                      style={eyeBtnStyle}
                    >
                      {showConfirm ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                {error && <p style={errorStyle}>{error}</p>}

                <button
                  type="submit"
                  className="clerk-primary-button-split"
                  disabled={
                    loading ||
                    !firstName.trim() ||
                    !lastName.trim() ||
                    !email.trim() ||
                    !password ||
                    !confirmPassword
                  }
                >
                  {loading ? (
                    "Creating account…"
                  ) : (
                    <>
                      Continue <span style={{ marginLeft: "6px" }}>›</span>
                    </>
                  )}
                </button>

                <p style={footerStyle}>
                  Already have an account?{" "}
                  <a href="/sign-in" className="clerk-link">
                    Sign in
                  </a>
                </p>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleVerify}>
                <p
                  style={{
                    textAlign: "center",
                    fontSize: "14px",
                    color: "#374151",
                    marginBottom: "20px",
                  }}
                >
                  We sent a verification code to <strong>{email}</strong>
                </p>

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
                      Verify <span style={{ marginLeft: "6px" }}>›</span>
                    </>
                  )}
                </button>

                <p style={{ ...footerStyle, marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("form");
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
                    Go back
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
