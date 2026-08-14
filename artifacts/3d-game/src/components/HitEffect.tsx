const STYLES = `
@keyframes droneShake {
  0%   { transform: translate(0,     0)    rotate(0deg);    }
  8%   { transform: translate(-10px, -8px) rotate(-3deg);   }
  18%  { transform: translate(10px,   8px) rotate( 3deg);   }
  30%  { transform: translate(-8px,   5px) rotate(-2deg);   }
  42%  { transform: translate( 8px,  -5px) rotate( 2deg);   }
  56%  { transform: translate(-5px,   3px) rotate(-1deg);   }
  70%  { transform: translate( 5px,  -3px) rotate( 1deg);   }
  85%  { transform: translate(-2px,   2px) rotate(-0.5deg); }
  100% { transform: translate(0,     0)    rotate(0deg);    }
}

@keyframes droneIconPop {
  0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 0; }
  15%  { transform: translate(-50%,-50%) scale(1.6); opacity: 1; }
  55%  { transform: translate(-50%,-50%) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%,-50%) scale(1.5); opacity: 0; }
}

@keyframes hitmarkerPop {
  0%   { transform: rotate(45deg) scale(0.6); opacity: 0.5; }
  50%  { transform: rotate(45deg) scale(1.3); opacity: 1; }
  100% { transform: rotate(45deg) scale(1.0); opacity: 0.9; }
}

@keyframes scanlines {
  0%   { background-position: 0 0; }
  100% { background-position: 0 4px; }
}
`;

interface HitEffectProps {
  hitFlash: boolean;
  isBlind:  boolean;
}

export default function HitEffect({ hitFlash, isBlind }: HitEffectProps) {
  return (
    <>
      <style>{STYLES}</style>

      {/* Screen shake wrapper + red flash */ }
      <div
        style={{
          position:      "fixed",
          inset:         0,
          pointerEvents: "none",
          zIndex:        300,
          animation:     hitFlash ? "droneShake 0.45s ease-out" : "none",
        }}
      >
        {/* Blood red vignette flash */}
        <div
          style={{
            position:   "absolute",
            inset:      0,
            background: "radial-gradient(ellipse at center, rgba(255,10,10,0.55) 0%, rgba(180,0,0,0.88) 100%)",
            opacity:    hitFlash ? 1 : 0,
            transition: hitFlash ? "opacity 0.04s" : "opacity 0.35s ease-out",
          }}
        />

        {/* Scanline horror overlay */}
        {hitFlash && (
          <div
            style={{
              position:           "absolute",
              inset:              0,
              backgroundImage:    "repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 2px, transparent 2px, transparent 4px)",
              backgroundSize:     "100% 4px",
              animation:          "scanlines 0.08s linear infinite",
              opacity:            0.6,
            }}
          />
        )}

        {/* Drone icon zoom in centre */}
        {hitFlash && (
          <div
            style={{
              position:   "absolute",
              top:        "50%",
              left:       "50%",
              fontSize:   96,
              animation:  "droneIconPop 0.45s ease-out forwards",
              filter:     "drop-shadow(0 0 30px #ff0000) drop-shadow(0 0 60px #ff0000)",
              lineHeight: 1,
            }}
          >
            🤖
          </div>
        )}

        {/* "DRONE HIT" text */}
        {hitFlash && (
          <div
            style={{
              position:   "absolute",
              top:        "calc(50% + 68px)",
              left:       "50%",
              transform:  "translateX(-50%)",
              color:      "#ff2244",
              fontSize:   14,
              fontFamily: "'Courier New', monospace",
              fontWeight: "bold",
              letterSpacing: 6,
              textShadow: "0 0 12px #ff0000",
              whiteSpace: "nowrap",
            }}
          >
            DRONE HIT
          </div>
        )}
      </div>

      {/* Blind overlay (black, holds 2 s then fades) */ }
      <div
        style={{
          position:      "fixed",
          inset:         0,
          pointerEvents: "none",
          background:    "#000",
          opacity:       isBlind ? 0.94 : 0,
          transition:    isBlind ? "opacity 0.06s" : "opacity 2s ease-out",
          zIndex:        299,
        }}
      />
    </>
  );
}
