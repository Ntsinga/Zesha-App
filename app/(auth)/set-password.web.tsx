import React, { useState } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useRouter } from "expo-router";
import { AlertCircle, LogOut } from "lucide-react";
import "../../styles/web.css";

// Import the background image
import backgroundImageSource from "../../assets/background.png";

/**
 * Set Password Page (Web) - For existing authenticated users without passwords
 * Note: New invited users should go through /welcome which uses sign-up flow
 */
export default function SetPasswordWeb() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [isSigningOut, setIsSigningOut] = useState(false);

  // If user already has password, redirect to app
  React.useEffect(() => {
    if (isLoaded && user?.passwordEnabled) {
      router.replace("/");
    }
  }, [isLoaded, user, router]);

  // If not authenticated, redirect to sign-in
  React.useEffect(() => {
    if (isLoaded && !user) {
      router.replace("/sign-in");
    }
  }, [isLoaded, user, router]);

  // Handle both string and object returns from the image import
  const getImageUrl = (img: any): string => {
    if (typeof img === "string") return img;
    if (img && typeof img === "object" && img.default) return img.default;
    if (img && typeof img === "object" && img.uri) return img.uri;
    return "";
  };

  const bgImageUrl = getImageUrl(backgroundImageSource);

  const handleSignOutAndReset = async () => {
    setIsSigningOut(true);
    try {
      // Store user's email for the reset flow
      const email = user?.primaryEmailAddress?.emailAddress;

      // Sign out the user
      await signOut();

      // Redirect to sign-in with a message
      router.replace(
        `/sign-in${email ? `?email=${encodeURIComponent(email)}` : ""}`,
      );
    } catch (err) {
      console.error("Sign out error:", err);
      setIsSigningOut(false);
    }
  };

  if (!isLoaded) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div className="loading-spinner" />
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
            <h2 className="auth-form-title">Password Required</h2>
            <p className="auth-form-subtitle">
              {user?.firstName ? `Hi ${user.firstName}!` : "Hi there!"} Your
              account needs a password to continue.
            </p>
          </div>

          <div className="auth-form-card">
            <div style={{ padding: "20px 0" }}>
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#FEF3C7",
                  borderRadius: "12px",
                  marginBottom: "24px",
                  border: "1px solid #FCD34D",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "start", gap: "12px" }}
                >
                  <AlertCircle
                    size={20}
                    color="#D97706"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />
                  <div>
                    <h3
                      style={{
                        color: "#92400E",
                        fontSize: "14px",
                        fontWeight: "600",
                        marginBottom: "4px",
                      }}
                    >
                      Security Verification Required
                    </h3>
                    <p
                      style={{
                        color: "#78350F",
                        fontSize: "14px",
                        lineHeight: "1.5",
                      }}
                    >
                      For security reasons, you need to set up your password
                      through a secure verification process.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#111827",
                    marginBottom: "12px",
                  }}
                >
                  How to set up your password:
                </h3>
                <ol
                  style={{
                    paddingLeft: "20px",
                    color: "#4B5563",
                    fontSize: "14px",
                    lineHeight: "1.8",
                  }}
                >
                  <li style={{ marginBottom: "8px" }}>
                    Click the button below to sign out
                  </li>
                  <li style={{ marginBottom: "8px" }}>
                    Go to the sign-in page
                  </li>
                  <li style={{ marginBottom: "8px" }}>
                    Click "Forgot password?" to reset your password
                  </li>
                  <li>
                    Check your email (
                    <strong>{user?.primaryEmailAddress?.emailAddress}</strong>)
                    for the reset link
                  </li>
                </ol>
              </div>

              <button
                onClick={handleSignOutAndReset}
                disabled={isSigningOut}
                style={{
                  width: "100%",
                  padding: "14px",
                  backgroundColor: isSigningOut ? "#F87171" : "#DC2626",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: isSigningOut ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isSigningOut ? (
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
                    Signing Out...
                  </>
                ) : (
                  <>
                    <LogOut size={18} />
                    Sign Out & Reset Password
                  </>
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
                This is a one-time setup to secure your account
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
