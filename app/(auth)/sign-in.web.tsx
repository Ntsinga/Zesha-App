import React from "react";
import { SignIn } from "@clerk/clerk-react";
import "../../styles/web.css";

/**
 * Sign In Web - Uses Clerk's predefined SignIn component
 */
export default function SignInWeb() {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-logo">Zesha Agent</h1>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "clerk-root-box",
              card: "clerk-card",
              headerTitle: "clerk-header-title",
              headerSubtitle: "clerk-header-subtitle",
              socialButtonsBlockButton: "clerk-social-button",
              formFieldInput: "clerk-input",
              formButtonPrimary: "clerk-primary-button",
              footerActionLink: "clerk-link",
              identifierInputField: "clerk-input",
              formFieldLabel: "clerk-label",
              dividerLine: "clerk-divider",
              dividerText: "clerk-divider-text",
              footer: "clerk-footer",
              formFieldInputShowPasswordButton: "clerk-password-button",
              formFieldAction: "clerk-field-action",
              otpCodeFieldInput: "clerk-input",
            },
            variables: {
              colorPrimary: "#dc2626",
              colorTextOnPrimaryBackground: "#ffffff",
              colorBackground: "#ffffff",
              colorInputBackground: "#ffffff",
              colorInputText: "#111827",
              borderRadius: "10px",
            },
          }}
          routing="hash"
          signUpUrl="/sign-up"
          afterSignInUrl="/"
          fallbackRedirectUrl="/"
        />
      </div>
    </div>
  );
}
