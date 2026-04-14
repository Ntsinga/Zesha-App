import React, { useId } from "react";

interface TelebaIconProps {
  size?: number;
}

/**
 * Teleba brand icon SVG — matches the splash screen and design mockups.
 * Uses unique IDs per instance to avoid SVG defs conflicts when rendered multiple times.
 */
export default function TelebaIcon({ size = 38 }: TelebaIconProps) {
  const uid = useId().replace(/:/g, "");
  const ids = {
    bg: `${uid}iBg`,
    gold: `${uid}iGold`,
    t: `${uid}iT`,
    tShine: `${uid}iTShine`,
    vig: `${uid}iVig`,
    clip: `${uid}iClip`,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: 10, display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={ids.bg} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C0152A" />
          <stop offset="50%" stopColor="#9A0E1F" />
          <stop offset="100%" stopColor="#6B0714" />
        </linearGradient>
        <linearGradient id={ids.gold} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE566" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
        <linearGradient id={ids.t} x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#F0F0F0" />
          <stop offset="70%" stopColor="#D8D8D8" />
          <stop offset="100%" stopColor="#B0B0B0" />
        </linearGradient>
        <linearGradient id={ids.tShine} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.9} />
          <stop offset="40%" stopColor="#FFFFFF" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
        <radialGradient id={ids.vig} cx="50%" cy="50%" r="70%">
          <stop offset="55%" stopColor="#000000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
        </radialGradient>
        <clipPath id={ids.clip}>
          <rect width="1024" height="1024" rx="220" ry="220" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${ids.clip})`}>
        <rect width="1024" height="1024" fill={`url(#${ids.bg})`} />
        <circle
          cx="120"
          cy="140"
          r="280"
          fill="none"
          stroke="#FFF"
          strokeWidth="1.5"
          opacity="0.06"
        />
        <circle
          cx="900"
          cy="880"
          r="300"
          fill="none"
          stroke="#FFF"
          strokeWidth="1.5"
          opacity="0.06"
        />
        <ellipse
          cx="512"
          cy="490"
          rx="320"
          ry="300"
          fill="rgba(255,59,59,0.28)"
        />
        <circle
          cx="512"
          cy="512"
          r="430"
          fill="none"
          stroke={`url(#${ids.gold})`}
          strokeWidth="2.5"
          opacity="0.4"
          strokeDasharray="680 2020"
        />
        <path
          d="M512 200 L690 278 L690 460 Q690 578 512 648 Q334 578 334 460 L334 278 Z"
          fill="rgba(255,215,0,0.12)"
          stroke={`url(#${ids.gold})`}
          strokeWidth="2.5"
          opacity="0.5"
        />
        <rect
          x="248"
          y="255"
          width="528"
          height="142"
          rx="24"
          ry="24"
          fill={`url(#${ids.t})`}
        />
        <rect
          x="441"
          y="255"
          width="142"
          height="470"
          rx="24"
          ry="24"
          fill={`url(#${ids.t})`}
        />
        <rect
          x="248"
          y="255"
          width="528"
          height="60"
          rx="24"
          ry="24"
          fill={`url(#${ids.tShine})`}
          opacity="0.6"
        />
        <rect
          x="441"
          y="255"
          width="65"
          height="470"
          rx="12"
          ry="12"
          fill={`url(#${ids.tShine})`}
          opacity="0.3"
        />
        <g opacity="0.85" transform="translate(686,560)">
          <path
            d="M0,50 Q20,20 50,0"
            fill="none"
            stroke={`url(#${ids.gold})`}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M0,80 Q40,30 80,0"
            fill="none"
            stroke={`url(#${ids.gold})`}
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M0,110 Q60,40 110,0"
            fill="none"
            stroke={`url(#${ids.gold})`}
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.45"
          />
          <circle cx="0" cy="50" r="6" fill="#FFD700" />
        </g>
        <rect width="1024" height="1024" fill={`url(#${ids.vig})`} />
      </g>
    </svg>
  );
}
