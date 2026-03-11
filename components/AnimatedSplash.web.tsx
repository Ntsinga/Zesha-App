import React, { useEffect, useState } from "react";

interface AnimatedSplashProps {
  onFinish: () => void;
}

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 3800);
    const doneTimer = setTimeout(() => onFinish(), 4400);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div
      style={{
        ...styles.splash,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.6s ease",
      }}
    >
      <style>{css}</style>

      {/* Grid overlay */}
      <div style={styles.grid} />

      {/* Top light leak */}
      <div style={styles.topLeak} />

      {/* Center glow */}
      <div style={styles.centerGlow} />

      {/* Rings */}
      <div
        className="tel-ring"
        style={{
          width: 900,
          height: 900,
          top: "50%",
          left: "50%",
          animationDelay: "0s",
        }}
      />
      <div
        className="tel-ring"
        style={{
          width: 700,
          height: 700,
          top: "50%",
          left: "50%",
          borderColor: "rgba(255,215,0,0.08)",
          animationDelay: "0.4s",
        }}
      />
      <div
        className="tel-ring"
        style={{
          width: 520,
          height: 520,
          top: "50%",
          left: "50%",
          animationDelay: "0.8s",
        }}
      />

      {/* Corner circles */}
      <div
        style={{
          ...styles.cornerCircle,
          width: 420,
          height: 420,
          top: -140,
          left: -140,
        }}
      />
      <div
        style={{
          ...styles.cornerCircle,
          width: 460,
          height: 460,
          bottom: -160,
          right: -160,
        }}
      />

      {/* Logo content */}
      <div className="tel-fadeUp" style={styles.logoWrap}>
        {/* Icon */}
        <div className="tel-iconDrop" style={styles.iconBox}>
          <div className="tel-halo" style={styles.iconHalo} />
          <img
            src="/icon.png"
            alt="Teleba"
            style={styles.iconImg}
          />
        </div>

        {/* Brand name */}
        <div
          className="tel-fadeUpEl"
          style={{ ...styles.brandName, animationDelay: "0.45s" }}
        >
          TELEBA
        </div>

        {/* Divider */}
        <div
          className="tel-fadeUpEl"
          style={{ ...styles.dividerRow, animationDelay: "0.6s" }}
        >
          <div style={styles.dividerLine} />
          <div style={styles.dividerDiamond} />
          <div style={styles.dividerLine} />
        </div>

        {/* Tagline */}
        <div
          className="tel-fadeUpEl"
          style={{ ...styles.tagline, animationDelay: "0.7s" }}
        >
          Telecom &amp; Agency Banking
        </div>
      </div>

      {/* Loading bar */}
      <div
        className="tel-fadeUpEl"
        style={{ ...styles.loaderWrap, animationDelay: "0.9s" }}
      >
        <div style={styles.loaderTrack}>
          <div className="tel-barFill" style={styles.loaderBar} />
        </div>
        <div style={styles.loaderLabel}>Initializing</div>
      </div>

      {/* Vignette */}
      <div style={styles.vignette} />
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=Montserrat:wght@300;400&display=swap');

  .tel-ring {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.06);
    transform: translate(-50%, -50%);
    animation: tel-ringPulse 4s ease-in-out infinite;
  }

  .tel-fadeUp {
    animation: tel-fadeUp 1s cubic-bezier(0.22,1,0.36,1) both;
    animation-delay: 0.2s;
  }

  .tel-fadeUpEl {
    animation: tel-fadeUp 1s cubic-bezier(0.22,1,0.36,1) both;
    opacity: 0;
  }

  .tel-iconDrop {
    animation: tel-iconDrop 0.9s cubic-bezier(0.22,1,0.36,1) both;
    animation-delay: 0.1s;
  }

  .tel-halo {
    animation: tel-halo 3s ease-in-out infinite;
    animation-delay: 1.2s;
  }

  .tel-barFill {
    animation: tel-barFill 2.2s cubic-bezier(0.4,0,0.2,1) forwards;
    animation-delay: 1.1s;
    width: 0%;
  }

  @keyframes tel-ringPulse {
    0%,100% { opacity:0.5; transform:translate(-50%,-50%) scale(1); }
    50%      { opacity:1;   transform:translate(-50%,-50%) scale(1.015); }
  }
  @keyframes tel-fadeUp {
    from { opacity:0; transform:translateY(30px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes tel-iconDrop {
    from { opacity:0; transform:scale(0.7) translateY(-20px); }
    to   { opacity:1; transform:scale(1) translateY(0); }
  }
  @keyframes tel-halo {
    0%,100% { opacity:0.6; transform:translate(-50%,-50%) scale(1); }
    50%      { opacity:1;   transform:translate(-50%,-50%) scale(1.12); }
  }
  @keyframes tel-barFill {
    0%   { width:0%; }
    60%  { width:75%; }
    85%  { width:90%; }
    100% { width:100%; }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  splash: {
    position: "fixed",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(145deg, #C8162D 0%, #8E0C1A 50%, #520610 100%)",
    overflow: "hidden",
    zIndex: 9999,
  },
  grid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
    backgroundSize: "80px 80px",
  },
  topLeak: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
    background:
      "radial-gradient(ellipse at 30% 0%, rgba(255,120,120,0.14) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  centerGlow: {
    position: "absolute",
    width: 600,
    height: 560,
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    background:
      "radial-gradient(ellipse at center, rgba(255,60,60,0.22) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  cornerCircle: {
    position: "absolute",
    borderRadius: "50%",
    border: "1.2px solid rgba(255,255,255,0.05)",
  },
  logoWrap: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 28,
  },
  iconBox: {
    position: "relative",
    width: 140,
    height: 140,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  iconHalo: {
    position: "absolute",
    width: 180,
    height: 180,
    top: "50%",
    left: "50%",
    background:
      "radial-gradient(circle, rgba(255,215,0,0.18) 0%, transparent 70%)",
    borderRadius: "50%",
  },
  iconImg: {
    width: 140,
    height: 140,
    borderRadius: 32,
    filter: "drop-shadow(0 18px 36px rgba(0,0,0,0.45))",
    position: "relative",
    zIndex: 1,
  },
  brandName: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: "clamp(52px, 10vw, 76px)",
    fontWeight: 700,
    letterSpacing: "0.12em",
    background:
      "linear-gradient(180deg, #FFE566 0%, #FFD700 50%, #B8860B 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    filter: "drop-shadow(0 2px 12px rgba(255,215,0,0.35))",
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  dividerLine: {
    width: 60,
    height: 1,
    background:
      "linear-gradient(90deg, transparent, rgba(255,215,0,0.6), transparent)",
  },
  dividerDiamond: {
    width: 7,
    height: 7,
    background: "#FFD700",
    transform: "rotate(45deg)",
    opacity: 0.85,
  },
  tagline: {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: "clamp(11px, 2vw, 14px)",
    fontWeight: 300,
    letterSpacing: "0.28em",
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
  },
  loaderWrap: {
    position: "absolute",
    bottom: 72,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    zIndex: 10,
  },
  loaderTrack: {
    width: 180,
    height: 2,
    background: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  loaderBar: {
    height: "100%",
    background: "linear-gradient(90deg, #B8860B, #FFD700, #FFE566)",
    borderRadius: 2,
    boxShadow: "0 0 10px rgba(255,215,0,0.5)",
  },
  loaderLabel: {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: 10,
    fontWeight: 400,
    letterSpacing: "0.22em",
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
  },
  vignette: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.5) 100%)",
    pointerEvents: "none",
  },
};
