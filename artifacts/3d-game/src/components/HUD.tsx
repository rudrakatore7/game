import { useMemo, useEffect, useState } from "react";
import type { Difficulty } from "../difficulty";
import { DIFFICULTY_CONFIGS } from "../difficulty";

interface HUDProps {
  score: number;
  lives: number;
  maxLives: number;
  collected: number;
  total: number;
  isLocked: boolean;
  isMobile: boolean;
  difficulty: Difficulty;
  timeLeft: number;
  timeLimit: number;
  ammo?: number;
  isReloading?: boolean;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function HUD({ score, lives, maxLives, collected, total, isLocked, isMobile, difficulty, timeLeft, timeLimit, ammo, isReloading }: HUDProps) {
  const small = isMobile;
  const cfg = DIFFICULTY_CONFIGS[difficulty];

  const timeFrac = timeLeft / timeLimit;
  const timeDanger = timeLeft <= 20;
  const timeWarning = timeLeft <= 60 && !timeDanger;

  const timerColor = useMemo(() => {
    if (timeDanger) return "#ff003c";
    if (timeWarning) return "#ffaa00";
    return cfg.color;
  }, [timeDanger, timeWarning, cfg.color]);

  // Glitch effect on score change
  const [displayScore, setDisplayScore] = useState(score);
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    if (score !== displayScore) {
      setIsGlitching(true);
      const timer = setTimeout(() => {
        setDisplayScore(score);
        setIsGlitching(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [score, displayScore]);

  return (
    <div className="hud">
      {/* Global Visor Overlay (Scanlines & Vignette) */}
      <div className="visor-overlay" />

      {/* Top bar */}
      <div
        style={{
          position: "absolute",
          top: small ? 8 : 16,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: small ? "0 10px" : "0 32px",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        {/* Score */}
        <div className="hud-panel hud-score">
          <div className="hud-label">SCORE // SYS.01</div>
          <div className={`hud-value ${isGlitching ? "glitch-text" : ""}`}>
            {displayScore.toString().padStart(5, "0")}
          </div>
        </div>

        {/* Timer — centre */}
        <div className={`hud-panel hud-timer ${timeDanger ? "danger-pulse" : ""}`} style={{ borderColor: timerColor }}>
          <div className="hud-label" style={{ color: timerColor }}>TIME // UPLINK</div>
          <div className="hud-value timer-text" style={{ color: timeDanger ? timerColor : "#fff" }}>
            {formatTime(timeLeft)}
          </div>
          {/* Time bar */}
          <div className="timer-bar-bg">
            <div
              className="timer-bar-fill"
              style={{
                background: timerColor,
                width: `${Math.max(0, timeFrac * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Lives */}
        <div className="hud-panel hud-lives">
          <div className="hud-label" style={{ color: "#ff003c" }}>INTEGRITY // HP</div>
          <div className="lives-container">
            {Array.from({ length: maxLives }).map((_, i) => (
              <div key={i} className={`life-node ${i < lives ? "active" : "depleted"}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Gems progress — below top bar */}
      <div className="hud-panel hud-progress" style={{ top: small ? 68 : 92, borderColor: `${cfg.color}66` }}>
        <span className="hud-icon" style={{ color: cfg.color }}>◆</span>
        <span className="hud-progress-text">{collected} / {total}</span>
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{
              background: cfg.color,
              width: `${Math.min((collected / total) * 100, 100)}%`,
              boxShadow: `0 0 10px ${cfg.color}`,
            }}
          />
        </div>
      </div>

      {/* Difficulty badge bottom-center */}
      <div className="hud-badge" style={{ bottom: small ? 120 : 24, color: cfg.color, borderColor: `${cfg.color}55`, background: `${cfg.color}11` }}>
        <span className="badge-icon">{cfg.icon}</span> 
        <span className="badge-label">{cfg.label} // MODE</span>
      </div>

      {/* Desktop click-to-play */}
      {!isLocked && !isMobile && (
        <div className="hud-prompt">
          <div className="prompt-title">SYSTEM STANDBY</div>
          <div className="prompt-sub">CLICK TO INITIALIZE UPLINK</div>
          <div className="prompt-keys">[W,A,S,D] MOVE · [R] RELOAD · [SPACE/F/CLICK] ENGAGE</div>
        </div>
      )}

      {/* Ammo indicator (Bottom Right) */}
      {ammo !== undefined && (
        <div className={`hud-panel hud-ammo ${isReloading ? "danger-pulse" : ""}`} style={{
          position: "absolute",
          bottom: small ? 180 : 40,
          right: small ? 20 : 40,
          borderColor: isReloading ? "#ff003c" : "#00f3ff",
        }}>
          <div className="hud-label" style={{ color: isReloading ? "#ff003c" : "#00f3ff" }}>
            MAG // {isReloading ? "RELOAD" : "READY"}
          </div>
          <div className="hud-value" style={{
            color: isReloading ? "#ff003c" : "#fff",
            fontSize: small ? "24px" : "36px",
            textAlign: "right"
          }}>
            {isReloading ? "0" : ammo} <span style={{fontSize: "0.5em", opacity: 0.5}}>/ ∞</span>
          </div>
        </div>
      )}

      {/* Mobile center dot */}
      {isMobile && <div className="mobile-center-dot" />}

      <style>{`
        /* Global Sci-Fi Styles */
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

        .hud {
          font-family: 'Share Tech Mono', monospace;
          user-select: none;
        }

        .visor-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          background-size: 100% 4px, 3px 100%;
          box-shadow: inset 0 0 100px rgba(0,0,0,0.9);
          opacity: 0.4;
        }

        .hud-panel {
          background: rgba(10, 15, 20, 0.85);
          border: 1px solid #00f3ff;
          box-shadow: 0 0 10px rgba(0, 243, 255, 0.2), inset 0 0 20px rgba(0, 243, 255, 0.05);
          backdrop-filter: blur(4px);
          position: relative;
        }

        /* Cyberpunk angled corners */
        .hud-score {
          padding: ${small ? "6px 12px" : "10px 24px"};
          clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%);
          border-bottom: 2px solid #00f3ff;
        }
        
        .hud-timer {
          padding: ${small ? "8px 16px" : "10px 32px"};
          clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px);
          text-align: center;
        }

        .hud-lives {
          padding: ${small ? "6px 12px" : "10px 24px"};
          clip-path: polygon(0 0, 100% 0, 100% 100%, 10px 100%, 0 calc(100% - 10px));
          border-bottom: 2px solid #ff003c;
          border-color: #ff003c;
          box-shadow: 0 0 10px rgba(255, 0, 60, 0.2), inset 0 0 20px rgba(255, 0, 60, 0.05);
          text-align: right;
        }

        .hud-ammo {
          padding: ${small ? "6px 12px" : "10px 24px"};
          clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
          border-right: 2px solid;
          border-bottom: 2px solid;
          min-width: ${small ? "80px" : "120px"};
        }

        .hud-progress {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          padding: ${small ? "6px 16px" : "8px 24px"};
          display: flex;
          align-items: center;
          gap: 12px;
          clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 100%, 0 100%);
          background: rgba(10, 15, 20, 0.9);
          border-bottom: 2px solid;
          z-index: 10;
        }

        .hud-label {
          color: #00f3ff;
          font-size: ${small ? "9px" : "12px"};
          letter-spacing: 3px;
          margin-bottom: 4px;
          opacity: 0.8;
          text-transform: uppercase;
        }

        .hud-value {
          color: #fff;
          font-size: ${small ? "20px" : "32px"};
          font-weight: bold;
          text-shadow: 0 0 10px rgba(255,255,255,0.5);
          letter-spacing: 2px;
        }

        .timer-text {
          font-variant-numeric: tabular-nums;
        }

        .timer-bar-bg {
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          margin-top: 8px;
          width: ${small ? "80px" : "120px"};
          overflow: hidden;
        }

        .timer-bar-fill {
          height: 100%;
          transition: width 0.9s linear, background 0.3s;
          box-shadow: 0 0 8px currentColor;
        }

        .lives-container {
          display: flex;
          gap: 6px;
          justify-content: flex-end;
          margin-top: 4px;
        }

        .life-node {
          width: ${small ? "12px" : "18px"};
          height: ${small ? "6px" : "8px"};
          transform: skewX(-30deg);
          transition: all 0.3s ease;
        }

        .life-node.active {
          background: #ff003c;
          box-shadow: 0 0 8px #ff003c;
        }

        .life-node.depleted {
          background: rgba(255, 0, 60, 0.15);
          border: 1px solid rgba(255, 0, 60, 0.3);
        }

        .hud-progress-text {
          color: #fff;
          font-size: ${small ? "14px" : "18px"};
          font-weight: bold;
          letter-spacing: 2px;
        }

        .progress-bar-bg {
          width: ${small ? "80px" : "120px"};
          height: 6px;
          background: rgba(255,255,255,0.1);
          transform: skewX(-45deg);
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          transition: width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .hud-badge {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          padding: 6px 16px;
          font-size: 11px;
          letter-spacing: 4px;
          text-transform: uppercase;
          clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%);
          border-left: 2px solid;
          border-right: 2px solid;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hud-prompt {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.85);
          border: 1px solid #00f3ff;
          padding: 16px 32px;
          text-align: center;
          clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);
          animation: promptPulse 2s infinite;
          z-index: 20;
        }

        .prompt-title {
          color: #00f3ff;
          font-size: 16px;
          letter-spacing: 6px;
          font-weight: bold;
          text-shadow: 0 0 10px #00f3ff;
          margin-bottom: 8px;
        }

        .prompt-sub {
          color: #fff;
          font-size: 12px;
          letter-spacing: 2px;
          margin-bottom: 12px;
        }

        .prompt-keys {
          color: rgba(0, 243, 255, 0.6);
          font-size: 10px;
          letter-spacing: 1px;
          background: rgba(0, 243, 255, 0.1);
          padding: 4px 8px;
          border-radius: 2px;
        }

        .mobile-center-dot {
          position: fixed;
          top: 50%;
          left: 50%;
          width: 8px;
          height: 8px;
          background: #00f3ff;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 10px #00f3ff;
          pointer-events: none;
          z-index: 20;
        }

        @keyframes promptPulse { 
          0%, 100% { opacity: 1; box-shadow: 0 0 15px rgba(0,243,255,0.4); } 
          50% { opacity: 0.7; box-shadow: 0 0 5px rgba(0,243,255,0.1); } 
        }

        .danger-pulse {
          animation: dangerPulse 0.5s infinite;
        }

        @keyframes dangerPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(255,0,60,0.6), inset 0 0 20px rgba(255,0,60,0.2); }
          50% { box-shadow: 0 0 5px rgba(255,0,60,0.2), inset 0 0 10px rgba(255,0,60,0.1); }
        }

        .glitch-text {
          animation: glitch 0.15s cubic-bezier(.25, .46, .45, .94) both infinite;
          color: #00f3ff;
        }

        @keyframes glitch {
          0% { transform: translate(0) }
          20% { transform: translate(-2px, 2px) }
          40% { transform: translate(-2px, -2px) }
          60% { transform: translate(2px, 2px) }
          80% { transform: translate(2px, -2px) }
          100% { transform: translate(0) }
        }
      `}</style>
    </div>
  );
}

