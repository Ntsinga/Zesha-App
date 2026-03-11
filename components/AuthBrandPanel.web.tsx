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
 * Shared left-side branding panel for all web auth screens.
 * Based on the Teleba splash screen design.
 */
export default function AuthBrandPanel() {
  const iconUrl = getImageUrl(iconSource);

  return (
    <div className="auth-brand-side">
      {/* Decorative background elements */}
      <div className="auth-ring-outer" />
      <div className="auth-cc-tl" />
      <div className="auth-cc-br" />
      <div className="auth-top-leak" />
      <div className="auth-center-glow" />

      {/* Main brand content */}
      <div className="auth-brand-content">
        {/* Icon with halo */}
        <div className="auth-brand-logo">
          <div className="auth-icon-wrap">
            <div className="auth-icon-halo" />
            <img
              src={iconUrl}
              alt="Teleba"
              width={110}
              height={110}
              style={{ borderRadius: 26 }}
            />
          </div>
        </div>

        {/* Brand name */}
        <h1 className="auth-brand-title">TELEBA</h1>

        {/* Divider */}
        <div className="auth-divider">
          <div className="auth-divider-line" />
          <div className="auth-divider-diamond" />
          <div className="auth-divider-line" />
        </div>

        {/* Tagline */}
        <p className="auth-brand-tagline">Telecom &middot; Agency Banking</p>
      </div>

      {/* Signal arcs — bottom right */}
      <div className="auth-signal-arcs">
        <svg
          width="110"
          height="100"
          viewBox="0 0 140 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="ag">
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="3"
                result="b"
              />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#ag)">
            <circle cx="8" cy="78" r="9" fill="#FFD700" />
            <path
              d="M20,62 Q54,24 92,10"
              stroke="#FFD700"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M20,80 Q66,30 118,12"
              stroke="#FFD700"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.65"
            />
            <path
              d="M20,100 Q80,40 138,16"
              stroke="#FFD700"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.35"
            />
          </g>
        </svg>
      </div>

      {/* Vignette overlay */}
      <div className="auth-vignette" />
    </div>
  );
}
