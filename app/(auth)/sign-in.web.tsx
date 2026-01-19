import React from "react";
import { SignIn } from "@clerk/clerk-react";
import "../../styles/web.css";

// Import the background image - Expo web requires ES6 import for assets
import backgroundImageSource from "../../assets/background.png";

/**
 * Sign In Web - Split screen design with branding on left, form on right
 */
export default function SignInWeb() {
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
            <h2 className="auth-form-title">Welcome</h2>
            <p className="auth-form-subtitle">
              Login to your account to continue
            </p>
          </div>

          <div className="auth-form-card">
            <SignIn
              appearance={{
                elements: {
                  rootBox: "clerk-root-box-split",
                  card: "clerk-card-split",
                  headerTitle: "clerk-header-title",
                  headerSubtitle: "clerk-header-subtitle",
                  socialButtonsBlockButton: "hide-element",
                  socialButtonsBlockButtonText: "hide-element",
                  socialButtons: "hide-element",
                  dividerRow: "hide-element",
                  formFieldInput: "clerk-input-split",
                  formButtonPrimary: "clerk-primary-button-split",
                  footerActionLink: "clerk-link",
                  identifierInputField: "clerk-input-split",
                  formFieldLabel: "clerk-label-split",
                  dividerLine: "hide-element",
                  dividerText: "hide-element",
                  footer: "clerk-footer-split",
                  formFieldInputShowPasswordButton: "clerk-password-button",
                  formFieldAction: "clerk-field-action-split",
                  otpCodeFieldInput: "clerk-input-split",
                  socialButtonsBlockButton__google: "hide-element",
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
              fallbackRedirectUrl="/"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
