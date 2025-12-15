import React from "react";
import { SignUp } from "@clerk/clerk-react";
import "../../styles/web.css";

/**
 * Sign Up Web - Uses Clerk's predefined SignUp component
 */
export default function SignUpWeb() {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-logo">Zesha Agent</h1>
          <p className="auth-subtitle">Create your account</p>
        </div>
        <SignUp
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
          signInUrl="/sign-in"
          afterSignUpUrl="/"
          fallbackRedirectUrl="/"
        />
      </div>
    </div>
  );
}
