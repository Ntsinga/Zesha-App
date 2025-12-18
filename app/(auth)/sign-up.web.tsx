import React from "react";
import { SignUp } from "@clerk/clerk-react";
import "../../styles/web.css";

// Import the background image - Expo web requires ES6 import for assets
import backgroundImageSource from "../../assets/background.png";

/**
 * Sign Up Web - Split screen design with branding on left, form on right
 */
export default function SignUpWeb() {
  // Handle both string and object returns from the image import
  // In Expo web, images may be imported as objects with a `default` or directly as strings
  const getImageUrl = (img: any): string => {
    if (typeof img === "string") return img;
    if (img && typeof img === "object" && img.default) return img.default;
    if (img && typeof img === "object" && img.uri) return img.uri;
    return "";
  };

  const bgImageUrl = getImageUrl(backgroundImageSource);

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
            Your trusted financial management partner
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Create Account</h2>
            <p className="auth-form-subtitle">
              Sign up to get started with Zesha Agent
            </p>
          </div>

          <div className="auth-form-card">
            <SignUp
              appearance={{
                elements: {
                  rootBox: "clerk-root-box-split",
                  card: "clerk-card-split",
                  headerTitle: "clerk-header-title",
                  headerSubtitle: "clerk-header-subtitle",
                  socialButtonsBlockButton: "clerk-social-button-split",
                  formFieldInput: "clerk-input-split",
                  formButtonPrimary: "clerk-primary-button-split",
                  footerActionLink: "clerk-link",
                  identifierInputField: "clerk-input-split",
                  formFieldLabel: "clerk-label-split",
                  dividerLine: "clerk-divider",
                  dividerText: "clerk-divider-text",
                  footer: "clerk-footer-split",
                  formFieldInputShowPasswordButton: "clerk-password-button",
                  formFieldAction: "clerk-field-action-split",
                  otpCodeFieldInput: "clerk-input-split",
                },
                variables: {
                  colorPrimary: "#dc2626",
                  colorTextOnPrimaryBackground: "#ffffff",
                  colorBackground: "#ffffff",
                  colorInputBackground: "#f9fafb",
                  colorInputText: "#111827",
                  borderRadius: "12px",
                },
              }}
              routing="hash"
              signInUrl="/sign-in"
              fallbackRedirectUrl="/"
            />
          </div>

          <div className="auth-form-footer">
            <p>
              Already have an account?{" "}
              <a href="/sign-in" className="auth-signup-link">
                Sign In
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
