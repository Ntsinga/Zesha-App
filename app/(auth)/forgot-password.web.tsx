import React, { useEffect, useRef, useState } from "react";
import { useAuth, useSignIn } from "@clerk/clerk-react";
import { useRouter } from "expo-router";
import "../../styles/web.css";
import AuthBrandPanel from "../../components/AuthBrandPanel.web";
import { validateEmail } from "../../utils/validators";

type Step = "request" | "reset" | "mfa";
type SecondFactorStrategy =
  | "email_code"
  | "phone_code"
  | "totp"
  | "backup_code";

interface SecondFactorState {
  strategy: SecondFactorStrategy;
  emailAddressId?: string;
  phoneNumberId?: string;
  safeIdentifier?: string | null;
}

export default function ForgotPasswordWeb() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [secondFactor, setSecondFactor] = useState<SecondFactorState | null>(
    null,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const canResendSecondFactor =
    secondFactor?.strategy === "email_code" ||
    secondFactor?.strategy === "phone_code";

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/(app)");
    }
  }, [isSignedIn, router]);

  useEffect(() => {
    if (step === "request") {
      emailRef.current?.focus();
    } else if (step === "reset") {
      codeRefs.current[0]?.focus();
    }
  }, [step]);

  const getPreferredSecondFactor = (signInAttempt: {
    supportedSecondFactors?: Array<SecondFactorState>;
  }): SecondFactorState | null => {
    const secondFactors = signInAttempt.supportedSecondFactors ?? [];
    const priority: SecondFactorStrategy[] = [
      "email_code",
      "phone_code",
      "totp",
      "backup_code",
    ];

    for (const strategy of priority) {
      const factor = secondFactors.find((entry) => entry.strategy === strategy);
      if (factor) {
        return {
          strategy: factor.strategy,
          emailAddressId: factor.emailAddressId,
          phoneNumberId: factor.phoneNumberId,
          safeIdentifier: factor.safeIdentifier ?? null,
        };
      }
    }

    return null;
  };

  const prepareSecondFactor = async (factor: SecondFactorState) => {
    if (!signIn) return;

    if (factor.strategy === "email_code") {
      await signIn.prepareSecondFactor({
        strategy: factor.strategy,
        ...(factor.emailAddressId
          ? { emailAddressId: factor.emailAddressId }
          : {}),
      });
      return;
    }

    if (factor.strategy === "phone_code") {
      await signIn.prepareSecondFactor({
        strategy: factor.strategy,
        ...(factor.phoneNumberId
          ? { phoneNumberId: factor.phoneNumberId }
          : {}),
      });
    }
  };

  const startSecondFactorStep = async (signInAttempt: {
    supportedSecondFactors?: Array<SecondFactorState>;
  }) => {
    const factor = getPreferredSecondFactor(signInAttempt);

    if (!factor) {
      setError(
        "This account requires a second verification method that this screen does not support yet.",
      );
      return;
    }

    if (factor.strategy === "email_code" || factor.strategy === "phone_code") {
      await prepareSecondFactor(factor);
    }

    setSecondFactor(factor);
    setMfaCode("");
    setStep("mfa");
    setSuccessMessage("");
  };

  const resetFlowState = () => {
    setCodeDigits(["", "", "", "", "", ""]);
    setPassword("");
    setConfirmPassword("");
    setMfaCode("");
    setError("");
    setSuccessMessage("");
    setSecondFactor(null);
    setStep("request");
  };

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...codeDigits];
    next[index] = digit;
    setCodeDigits(next);
    if (digit && index < 5) codeRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setCodeDigits(pasted.split(""));
      codeRefs.current[5]?.focus();
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    const normalizedEmail = email.trim().toLowerCase();
    const validation = validateEmail(normalizedEmail);
    if (!validation.isValid) {
      setError(validation.error || "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: normalizedEmail,
      });

      setEmail(normalizedEmail);
      setCodeDigits(["", "", "", "", "", ""]);
      setPassword("");
      setConfirmPassword("");
      setMfaCode("");
      setSecondFactor(null);
      setStep("reset");
      setSuccessMessage("We sent a verification code to your email address.");
    } catch (err: any) {
      setError(
        err.errors?.[0]?.message ||
          err.message ||
          "We could not start the password reset flow.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    const code = codeDigits.join("");
    if (code.length < 6) {
      setError("Please enter the verification code.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const verification = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
      });

      if (verification.status !== "needs_new_password") {
        setError(
          "Verification failed. Please request a new code and try again.",
        );
        return;
      }

      const resetAttempt = await signIn.resetPassword({
        password,
        signOutOfOtherSessions: true,
      });

      if (resetAttempt.status === "complete" && resetAttempt.createdSessionId) {
        await setActive({ session: resetAttempt.createdSessionId });
        router.replace("/(app)");
        return;
      }

      if (resetAttempt.status === "needs_second_factor") {
        await startSecondFactorStep(resetAttempt);
        return;
      }

      setError("Password reset could not be completed. Please try again.");
    } catch (err: any) {
      setError(
        err.errors?.[0]?.message ||
          err.message ||
          "Password reset failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySecondFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn || !secondFactor) return;

    if (!mfaCode.trim()) {
      setError(
        secondFactor.strategy === "backup_code"
          ? "Please enter a backup code."
          : "Please enter the verification code.",
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const signInAttempt = await signIn.attemptSecondFactor({
        strategy: secondFactor.strategy,
        code: mfaCode.trim(),
      });

      if (
        signInAttempt.status === "complete" &&
        signInAttempt.createdSessionId
      ) {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(app)");
        return;
      }

      setError("Verification failed. Please try again.");
    } catch (err: any) {
      setError(
        err.errors?.[0]?.message ||
          err.message ||
          "Verification failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendSecondFactor = async () => {
    if (!isLoaded || !signIn || !secondFactor || !canResendSecondFactor) return;

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await prepareSecondFactor(secondFactor);
      setMfaCode("");
      setSuccessMessage("A new verification code has been sent.");
    } catch (err: any) {
      setError(
        err.errors?.[0]?.message ||
          err.message ||
          "Failed to resend the verification code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signIn) return;

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim().toLowerCase(),
      });

      setCodeDigits(["", "", "", "", "", ""]);
      codeRefs.current[0]?.focus();
      setSuccessMessage("A new verification code has been sent.");
    } catch (err: any) {
      setError(
        err.errors?.[0]?.message ||
          err.message ||
          "Failed to resend the verification code.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBrandPanel>
      <div className="auth-centered-card">
        <div className="auth-form-header">
          <h2 className="auth-form-title">Reset password</h2>
          <p className="auth-form-subtitle">
            {step === "request"
              ? "Enter your email and we will send you a verification code"
              : step === "reset"
                ? "Enter the code we emailed you and set a new password"
                : secondFactor?.strategy === "backup_code"
                  ? "Enter a backup code to finish signing in after resetting your password"
                  : secondFactor?.strategy === "totp"
                    ? "Enter the code from your authenticator app to finish signing in"
                    : "Your password was updated. Complete the extra verification step to finish signing in"}
          </p>
        </div>

        {step === "request" ? (
          <form onSubmit={handleSendCode}>
            <div style={{ marginBottom: "20px" }}>
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

            {error && <p style={errorStyle}>{error}</p>}
            {successMessage && <p style={successStyle}>{successMessage}</p>}

            <button
              type="submit"
              className="clerk-primary-button-split"
              disabled={loading || !email.trim()}
            >
              {loading ? "Sending code..." : "Send reset code"}
            </button>

            <p style={footerStyle}>
              Remembered your password?{" "}
              <a href="/sign-in" className="clerk-link">
                Sign in
              </a>
            </p>
          </form>
        ) : step === "reset" ? (
          <form onSubmit={handleResetPassword}>
            <div
              style={{
                marginBottom: "16px",
                padding: "12px 14px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.7)",
                border: "1px solid #e5e7eb",
                textAlign: "center",
                color: "#374151",
                fontSize: "14px",
              }}
            >
              {email}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                className="clerk-label-split"
                style={{
                  display: "block",
                  marginBottom: "10px",
                  textAlign: "center",
                }}
              >
                Verification code
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                  marginBottom: "8px",
                }}
              >
                {codeDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      codeRefs.current[i] = el;
                    }}
                    className="clerk-input-split"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    onPaste={i === 0 ? handleCodePaste : undefined}
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
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                className="clerk-label-split"
                style={{ display: "block", marginBottom: "10px" }}
              >
                New password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="clerk-input-split"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a new password"
                  required
                  style={{ paddingRight: "48px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="clerk-password-button"
                  style={eyeBtnStyle}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                className="clerk-label-split"
                style={{ display: "block", marginBottom: "10px" }}
              >
                Confirm new password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="clerk-input-split"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  style={{ paddingRight: "48px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="clerk-password-button"
                  style={eyeBtnStyle}
                >
                  {showConfirmPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {error && <p style={errorStyle}>{error}</p>}
            {successMessage && <p style={successStyle}>{successMessage}</p>}

            <button
              type="submit"
              className="clerk-primary-button-split"
              disabled={
                loading ||
                codeDigits.join("").length < 6 ||
                !password ||
                !confirmPassword
              }
            >
              {loading ? "Resetting password..." : "Reset password"}
            </button>

            <p style={footerStyle}>
              Didn't receive a code?{" "}
              <button
                type="button"
                onClick={handleResendCode}
                className="clerk-link"
                style={linkButtonStyle}
                disabled={loading}
              >
                Resend
              </button>
            </p>

            <p style={{ ...footerStyle, marginTop: "8px" }}>
              <button
                type="button"
                onClick={resetFlowState}
                className="clerk-link"
                style={linkButtonStyle}
              >
                Use another email address
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifySecondFactor}>
            {secondFactor?.safeIdentifier ? (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.7)",
                  border: "1px solid #e5e7eb",
                  textAlign: "center",
                  color: "#374151",
                  fontSize: "14px",
                }}
              >
                {secondFactor.safeIdentifier}
              </div>
            ) : null}

            <div style={{ marginBottom: "16px" }}>
              <label
                className="clerk-label-split"
                style={{ display: "block", marginBottom: "10px" }}
              >
                {secondFactor?.strategy === "backup_code"
                  ? "Backup code"
                  : secondFactor?.strategy === "totp"
                    ? "Authenticator code"
                    : "Verification code"}
              </label>
              <input
                className="clerk-input-split"
                type="text"
                inputMode={
                  secondFactor?.strategy === "backup_code" ? "text" : "numeric"
                }
                value={mfaCode}
                onChange={(e) => {
                  if (secondFactor?.strategy === "backup_code") {
                    setMfaCode(e.target.value);
                    return;
                  }

                  setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                }}
                placeholder={
                  secondFactor?.strategy === "backup_code"
                    ? "Enter a backup code"
                    : "Enter verification code"
                }
                autoCapitalize="none"
                required
              />
            </div>

            {error && <p style={errorStyle}>{error}</p>}
            {successMessage && <p style={successStyle}>{successMessage}</p>}

            <button
              type="submit"
              className="clerk-primary-button-split"
              disabled={loading || !mfaCode.trim()}
            >
              {loading ? "Verifying..." : "Verify and sign in"}
            </button>

            {canResendSecondFactor ? (
              <p style={footerStyle}>
                Didn't receive a code?{" "}
                <button
                  type="button"
                  onClick={handleResendSecondFactor}
                  className="clerk-link"
                  style={linkButtonStyle}
                  disabled={loading}
                >
                  Resend
                </button>
              </p>
            ) : null}

            <p
              style={{
                ...footerStyle,
                marginTop: canResendSecondFactor ? "8px" : "16px",
              }}
            >
              <button
                type="button"
                onClick={resetFlowState}
                className="clerk-link"
                style={linkButtonStyle}
              >
                Start over
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

const successStyle: React.CSSProperties = {
  color: "#047857",
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
  fontSize: "12px",
  fontWeight: 600,
  color: "#6b7280",
};

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
};
