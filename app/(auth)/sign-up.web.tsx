import React from "react";
import { SignUp } from "@clerk/clerk-react";
import "../../styles/web.css";
import AuthBrandPanel from "../../components/AuthBrandPanel.web";

/**
 * Sign Up Web - Split screen design with branding on left, form on right
 */
export default function SignUpWeb() {


  return (
    <div className="auth-split-page">
      {/* Left Side - Branding */}
      <AuthBrandPanel />

      {/* Right Side - Form */}
      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Create Account</h2>
            <p className="auth-form-subtitle">
              Sign up to get started with Teleba
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
              signInUrl="/sign-in"
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
