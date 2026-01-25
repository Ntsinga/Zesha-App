import React, { useState, useEffect } from "react";
import { useUser, useSignUp, useClerk } from "@clerk/clerk-react";
import { useRouter } from "expo-router";
import { AlertCircle, Eye, EyeOff, Check } from "lucide-react";
import "../../styles/web.css";

// Import the background image
import backgroundImageSource from "../../assets/background.png";

/**
 * Set Password Page (Web) - For invited users to set their password
 * This page handles two flows:
 * 1. Invite flow: User arrives with __clerk_ticket, needs to accept invitation and set password
 * 2. Existing user: User is already authenticated but needs to set a password
 */
export default function SetPasswordWeb() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { signUp, setActive, isLoaded: isSignUpLoaded } = useSignUp();
  const { setActive: clerkSetActive } = useClerk();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);
  const [requiresUsername, setRequiresUsername] = useState(false);

  // Redirect state to prevent re-triggering redirects
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Check for invite ticket and process it
  const [ticketProcessed, setTicketProcessed] = useState(false);

  useEffect(() => {
    if (!isSignUpLoaded || isProcessingInvite || ticketProcessed) return;

    const urlParams = new URLSearchParams(window.location.search);
    const ticket = urlParams.get("__clerk_ticket");

    // If user is already authenticated (ticket might have auto-signed them in), skip ticket processing
    if (user) {
      console.log(
        "[SetPassword] User already authenticated, skipping ticket processing",
      );
      return;
    }

    // If signUp already has an email (from a previous ticket process), we're ready
    if (signUp?.emailAddress) {
      console.log(
        "[SetPassword] SignUp already has email, skipping ticket processing",
      );
      setInviteEmail(signUp.emailAddress);
      setTicketProcessed(true);
      // Check if username is required from existing signUp state
      if (signUp.missingFields?.includes("username")) {
        setRequiresUsername(true);
      }
      return;
    }

    if (ticket) {
      console.log(
        "[SetPassword] Processing invite ticket...",
        ticket.substring(0, 20) + "...",
      );
      setIsProcessingInvite(true);

      // Create a sign-up with the ticket - Clerk will auto-populate user info
      signUp
        ?.create({
          strategy: "ticket",
          ticket,
        })
        .then((result) => {
          console.log("[SetPassword] Invite result:", {
            status: result.status,
            email: result.emailAddress,
            missingFields: result.missingFields,
          });

          if (result.emailAddress) {
            setInviteEmail(result.emailAddress);
          }

          // Check if username is required - also set true if status is missing_requirements
          // since Clerk instance requires username for all users
          if (
            result.missingFields?.includes("username") ||
            result.status === "missing_requirements"
          ) {
            console.log("[SetPassword] Username is required, showing field");
            setRequiresUsername(true);
          }

          setTicketProcessed(true);

          // If status is complete, the user might already be signed in
          if (result.status === "complete" && result.createdSessionId) {
            console.log(
              "[SetPassword] Ticket auto-completed, activating session...",
            );
            setActive?.({ session: result.createdSessionId }).then(() => {
              console.log("[SetPassword] Session activated");
            });
          }
          // 'missing_requirements' is expected - user needs to set password/username
          // The form will handle this
        })
        .catch((err) => {
          console.error("[SetPassword] Failed to process invite:", err);

          // If ticket is already used or user exists, they should sign in
          const errorCode = err.errors?.[0]?.code;
          if (
            errorCode === "form_identifier_exists" ||
            errorCode === "ticket_invalid"
          ) {
            setError(
              "This invitation has already been used or expired. Please sign in.",
            );
            setTimeout(() => {
              window.location.href = "/sign-in";
            }, 2000);
          } else {
            setError(
              err.errors?.[0]?.message ||
                "Failed to process invitation. Please try again.",
            );
          }
        })
        .finally(() => {
          setIsProcessingInvite(false);
        });
    }
  }, [
    isSignUpLoaded,
    signUp,
    user,
    isProcessingInvite,
    setActive,
    ticketProcessed,
  ]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // For invite flow, we use signUp; for existing users, we use user
    // Check both inviteEmail state and signUp.emailAddress
    const hasInviteData =
      (!!inviteEmail || !!signUp?.emailAddress) && signUp && !user;

    if (!hasInviteData && (!isUserLoaded || !user)) return;

    // Validate username if required
    if (requiresUsername && !username.trim()) {
      setError("Please enter a username");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      if (hasInviteData && signUp) {
        // Invite flow: Update signUp with password (and username if required) and complete registration
        console.log("[SetPassword] Setting password for invite flow...", {
          requiresUsername,
          username,
        });

        // Build update payload
        const updatePayload: { password: string; username?: string } = {
          password,
        };
        if (requiresUsername && username.trim()) {
          updatePayload.username = username.trim();
        }

        const result = await signUp.update(updatePayload);

        console.log(
          "[SetPassword] SignUp status:",
          result.status,
          "sessionId:",
          result.createdSessionId,
          "missingFields:",
          result.missingFields,
        );

        if (result.status === "complete" && result.createdSessionId) {
          // Activate the session
          await setActive({ session: result.createdSessionId });
          console.log("[SetPassword] Session activated for invited user");
          setSuccess(true);
          setTimeout(() => {
            window.location.href = "/";
          }, 1500);
        } else {
          // Maybe needs verification or other step
          console.log(
            "[SetPassword] Status not complete, missing fields:",
            result.missingFields,
          );
          setError(
            `Registration incomplete. Missing: ${result.missingFields?.join(", ") || "unknown"}. Please try again.`,
          );
        }
      } else if (user) {
        // Existing user flow: Update password directly
        await user.updatePassword({
          newPassword: password,
        });

        // Reload user to ensure passwordEnabled is updated
        await user.reload();

        console.log(
          "[SetPassword] Password set successfully, passwordEnabled:",
          user.passwordEnabled,
        );
        setSuccess(true);

        // Use window.location for a clean redirect that avoids router race conditions
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      }
    } catch (err: any) {
      console.error("Set password error:", err);
      const errorMessage =
        err.errors?.[0]?.message || err.message || "Failed to set password";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: 0, label: "", color: "" };
    if (pwd.length < 8)
      return { strength: 1, label: "Too short", color: "#EF4444" };

    let strength = 1;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    const labels = ["Weak", "Fair", "Good", "Strong", "Very Strong"];
    const colors = ["#EF4444", "#F59E0B", "#10B981", "#059669", "#047857"];

    return {
      strength,
      label: labels[strength - 1],
      color: colors[strength - 1],
    };
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch =
    password && confirmPassword && password === confirmPassword;

  // Handle both string and object returns from the image import
  const getImageUrl = (img: any): string => {
    if (typeof img === "string") return img;
    if (img && typeof img === "object" && img.default) return img.default;
    if (img && typeof img === "object" && img.uri) return img.uri;
    return "";
  };

  const bgImageUrl = getImageUrl(backgroundImageSource);

  // Determine if we're ready to show the form
  // Check signUp object for email as well (it may have it before inviteEmail state is set)
  const signUpEmail = signUp?.emailAddress;
  const effectiveInviteEmail = inviteEmail || signUpEmail || null;
  const isInviteFlow = !!effectiveInviteEmail && !user;
  const isReady = (isUserLoaded && user) || isInviteFlow;
  const displayEmail =
    user?.primaryEmailAddress?.emailAddress || effectiveInviteEmail;
  const displayName =
    user?.firstName ||
    (effectiveInviteEmail ? effectiveInviteEmail.split("@")[0] : null);

  // Check if there's an error that should show the form with error message
  const hasError = !!error;

  // Debug logging - runs on every render to track state
  React.useEffect(() => {
    console.log("[SetPassword] State:", {
      isUserLoaded,
      isSignUpLoaded,
      hasUser: !!user,
      userEmail: user?.primaryEmailAddress?.emailAddress,
      inviteEmail,
      signUpEmail,
      isInviteFlow,
      passwordEnabled: user?.passwordEnabled,
      isRedirecting,
      isProcessingInvite,
      pathname: window.location.pathname,
    });
  }, [
    isUserLoaded,
    isSignUpLoaded,
    user,
    inviteEmail,
    isInviteFlow,
    isRedirecting,
    isProcessingInvite,
  ]);

  // If user already has password, redirect to app
  React.useEffect(() => {
    if (isUserLoaded && user?.passwordEnabled && !isRedirecting) {
      console.log(
        "[SetPassword] User already has password, initiating redirect...",
      );
      setIsRedirecting(true);
      // Small delay to ensure state updates are visible in logs
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    }
  }, [isUserLoaded, user?.passwordEnabled, isRedirecting]);

  // Timeout to redirect to sign-in if Clerk is loaded but no user/invite present
  React.useEffect(() => {
    // Don't redirect if we're processing an invite or have invite email
    if (
      isUserLoaded &&
      isSignUpLoaded &&
      !user &&
      !inviteEmail &&
      !isProcessingInvite
    ) {
      const timer = setTimeout(() => {
        console.log(
          "[SetPassword] Clerk loaded but no user/invite after 15s, redirecting to sign-in",
        );
        window.location.href = "/sign-in";
      }, 15000); // 15 seconds
      return () => clearTimeout(timer);
    }
  }, [isUserLoaded, isSignUpLoaded, user, inviteEmail, isProcessingInvite]);

  // Show redirecting state
  if (isRedirecting) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: "16px",
        }}
      >
        <div className="loading-spinner" />
        <p style={{ color: "#6B7280", fontSize: "14px" }}>
          Redirecting to dashboard...
        </p>
      </div>
    );
  }

  // Show loading while Clerk initializes or processing invite
  if (!isUserLoaded || !isSignUpLoaded || isProcessingInvite) {
    console.log(
      "[SetPassword] Rendering: Loading (Clerk not loaded or processing invite)",
    );
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: "16px",
        }}
      >
        <div className="loading-spinner" />
        <p style={{ color: "#6B7280", fontSize: "14px" }}>Loading...</p>
      </div>
    );
  }

  // If no user and no invite after Clerk loads, show message and wait
  // But if there's an error, show it with option to go to sign-in
  if (!isReady) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: "16px",
          padding: "20px",
        }}
      >
        {hasError ? (
          <>
            <div
              style={{
                padding: "16px",
                backgroundColor: "#FEE2E2",
                borderRadius: "8px",
                maxWidth: "400px",
                textAlign: "center",
              }}
            >
              <p style={{ color: "#DC2626", fontSize: "14px", margin: 0 }}>
                {error}
              </p>
            </div>
            <a
              href="/sign-in"
              style={{
                color: "#3B82F6",
                fontSize: "14px",
                textDecoration: "underline",
              }}
            >
              Go to Sign In
            </a>
          </>
        ) : (
          <>
            <div className="loading-spinner" />
            <p style={{ color: "#6B7280", fontSize: "14px" }}>
              Initializing your account...
            </p>
            <p style={{ color: "#9CA3AF", fontSize: "12px" }}>
              If this takes too long, please refresh the page
            </p>
            <a
              href="/sign-in"
              style={{
                color: "#3B82F6",
                fontSize: "12px",
                textDecoration: "underline",
                marginTop: "16px",
              }}
            >
              Or go to Sign In
            </a>
          </>
        )}
      </div>
    );
  }

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
        {/* Logo and branding */}
        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            {/* Rounded square logo with Z */}
            <div className="auth-logo-box">
              <span className="auth-logo-letter">Z</span>
            </div>
          </div>
          <h1 className="auth-brand-title">ZESHA AGENT</h1>
          <p className="auth-brand-tagline">
            Welcome! Set your password to continue
          </p>
        </div>
      </div>

      {/* Right Side - Password Reset Instructions */}
      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Set Your Password</h2>
            <p className="auth-form-subtitle">
              {displayName ? `Hi ${displayName}!` : "Hi there!"} Create a secure
              password for your account.
            </p>
            {displayEmail && (
              <p
                style={{ fontSize: "14px", color: "#6B7280", marginTop: "8px" }}
              >
                {displayEmail}
              </p>
            )}
          </div>

          <div className="auth-form-card">
            {success ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    backgroundColor: "#D1FAE5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <Check size={32} color="#059669" />
                </div>
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#111827",
                    marginBottom: "8px",
                  }}
                >
                  Password Set Successfully!
                </h3>
                <p style={{ color: "#6B7280", fontSize: "14px" }}>
                  Redirecting you to the app...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSetPassword} style={{ padding: "20px 0" }}>
                {error && (
                  <div
                    style={{
                      padding: "12px 16px",
                      backgroundColor: "#FEE2E2",
                      borderRadius: "8px",
                      marginBottom: "20px",
                      border: "1px solid #FECACA",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "start",
                        gap: "8px",
                      }}
                    >
                      <AlertCircle
                        size={18}
                        color="#DC2626"
                        style={{ flexShrink: 0, marginTop: "2px" }}
                      />
                      <p
                        style={{
                          color: "#991B1B",
                          fontSize: "14px",
                          margin: 0,
                        }}
                      >
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Username field - only shown if required */}
                {requiresUsername && (
                  <div style={{ marginBottom: "20px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "8px",
                      }}
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      autoComplete="username"
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: "16px",
                        border: "1px solid #D1D5DB",
                        borderRadius: "12px",
                        backgroundColor: "#F9FAFB",
                        outline: "none",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#DC2626")}
                      onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")}
                    />
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6B7280",
                        marginTop: "8px",
                      }}
                    >
                      This will be your unique identifier
                    </p>
                  </div>
                )}

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "8px",
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      style={{
                        width: "100%",
                        padding: "12px 40px 12px 16px",
                        fontSize: "16px",
                        border: "1px solid #D1D5DB",
                        borderRadius: "12px",
                        backgroundColor: "#F9FAFB",
                        outline: "none",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#DC2626")}
                      onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#6B7280",
                        padding: "4px",
                      }}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {password && (
                    <div style={{ marginTop: "8px" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "4px",
                          marginBottom: "4px",
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            style={{
                              flex: 1,
                              height: "4px",
                              borderRadius: "2px",
                              backgroundColor:
                                level <= passwordStrength.strength
                                  ? passwordStrength.color
                                  : "#E5E7EB",
                            }}
                          />
                        ))}
                      </div>
                      <p
                        style={{
                          fontSize: "12px",
                          color: passwordStrength.color,
                          margin: 0,
                        }}
                      >
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}

                  <p
                    style={{
                      fontSize: "12px",
                      color: "#6B7280",
                      marginTop: "8px",
                    }}
                  >
                    Must be at least 8 characters
                  </p>
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "8px",
                    }}
                  >
                    Confirm Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      style={{
                        width: "100%",
                        padding: "12px 40px 12px 16px",
                        fontSize: "16px",
                        border: "1px solid #D1D5DB",
                        borderRadius: "12px",
                        backgroundColor: "#F9FAFB",
                        outline: "none",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#DC2626")}
                      onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#6B7280",
                        padding: "4px",
                      }}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>

                  {confirmPassword && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "8px",
                      }}
                    >
                      {passwordsMatch ? (
                        <>
                          <Check size={16} color="#059669" />
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#059669",
                              margin: 0,
                            }}
                          >
                            Passwords match
                          </p>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} color="#DC2626" />
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#DC2626",
                              margin: 0,
                            }}
                          >
                            Passwords don't match
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    !password ||
                    !confirmPassword ||
                    password !== confirmPassword
                  }
                  style={{
                    width: "100%",
                    padding: "14px",
                    backgroundColor:
                      isLoading ||
                      !password ||
                      !confirmPassword ||
                      password !== confirmPassword
                        ? "#F87171"
                        : "#DC2626",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor:
                      isLoading ||
                      !password ||
                      !confirmPassword ||
                      password !== confirmPassword
                        ? "not-allowed"
                        : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {isLoading ? (
                    <>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "white",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      Setting Password...
                    </>
                  ) : (
                    "Set Password"
                  )}
                </button>

                <p
                  style={{
                    marginTop: "16px",
                    fontSize: "12px",
                    color: "#6B7280",
                    textAlign: "center",
                  }}
                >
                  Your password will be used to sign in to your account
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
