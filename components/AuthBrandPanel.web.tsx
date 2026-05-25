import React from "react";

// Use the actual icon image so changes to the asset are reflected automatically
import iconSource from "../assets/icon.png";

const getImageUrl = (img: unknown): string => {
  if (typeof img === "string") return img;
  if (img && typeof img === "object" && "default" in img)
    return (img as { default: string }).default;
  if (img && typeof img === "object" && "uri" in img)
    return (img as { uri: string }).uri;
  return "";
};

/**
 * Full-page branded background wrapper for web auth screens.
 * Renders the red gradient + decorative elements with children centered on top.
 * Pass `wide` for forms that need more horizontal space (e.g. multi-field forms).
 */
export default function AuthBrandPanel({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  const iconUrl = getImageUrl(iconSource);

  return (
    <div className="auth-centered-page">
      {/* Decorative background elements */}
      <div className="auth-ring-outer" />
      <div className="auth-cc-tl" />
      <div className="auth-cc-br" />
      <div className="auth-top-leak" />
      <div className="auth-center-glow" />

      {/* Vignette overlay */}
      <div className="auth-vignette" />

      {/* Centered content: logo + children */}
      <div
        className="auth-centered-content"
        style={wide ? { maxWidth: 560 } : undefined}
      >
        <a
          href="https://teleba.io"
          style={{ textDecoration: "none", display: "contents" }}
        >
          <div className="auth-brand-logo">
            <div className="auth-icon-wrap">
              <div className="auth-icon-halo" />
              <img
                src={iconUrl}
                alt="Teleba"
                width={72}
                height={72}
                style={{ borderRadius: 20 }}
              />
            </div>
          </div>
          <h1 className="auth-brand-title">TELEBA</h1>
        </a>

        {children}
      </div>
    </div>
  );
}
