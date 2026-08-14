import { useMemo, useState, useRef } from "react";
import { isMobile } from "../hooks/useMobileControls";
import type { Difficulty } from "../difficulty";
import { DIFFICULTY_CONFIGS } from "../difficulty";
import type { LeaderboardEntry } from "../leaderboard";

interface StartScreenProps {
  onStart: (difficulty: Difficulty, name: string) => void;
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  initialName: string;
}

const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

const DIFF_BADGE: Record<string, string> = { easy: "#00cc66", normal: "#00aaff", hard: "#ff4444" };

function diffLabel(d: string) {
  return d.toUpperCase()[0];
}

export default function StartScreen({ onStart, leaderboard, isLoading, initialName }: StartScreenProps) {
  const mobile = useMemo(() => isMobile(), []);
  const [selected, setSelected] = useState<Difficulty>("normal");
  const [name, setName] = useState(initialName);
  const [nameError, setNameError] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const cfg = DIFFICULTY_CONFIGS[selected];

  function handleStart() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(true);
      nameRef.current?.focus();
      return;
    }
    onStart(selected, trimmed);
  }

  const top15 = leaderboard.slice(0, 15);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(ellipse at center, #0a1a2e 0%, #000 100%)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 100,
        fontFamily: "'Courier New', monospace",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: mobile ? 480 : 900,
          padding: mobile ? "20px 16px 32px" : "32px 32px 40px",
          display: "flex",
          flexDirection: mobile ? "column" : "row",
          gap: mobile ? 24 : 32,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT COLUMN */ }
        <div style={{ flex: "1 1 380px", minWidth: 0 }}>
          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ color: "#ffd700", fontSize: mobile ? 10 : 11, letterSpacing: 6, marginBottom: 4 }}>
              FIRST PERSON
            </div>
            <h1
              style={{
                color: "#fff",
                fontSize: mobile ? 36 : 52,
                fontWeight: "bold",
                letterSpacing: 4,
                textShadow: "0 0 30px rgba(0,204,255,0.6)",
                margin: "0 0 4px",
              }}
            >
              LABYRINTH
            </h1>
            <div style={{ color: "#00ccff", fontSize: mobile ? 10 : 12, letterSpacing: 3 }}>
              COLLECT GEMS — AVOID THE DRONES
            </div>
          </div>

          {/* About the game */}
          <div
            style={{
              background: "rgba(0,180,255,0.06)",
              border: "1px solid rgba(0,180,255,0.18)",
              borderRadius: 10,
              padding: mobile ? "12px 14px" : "14px 18px",
              marginBottom: 16,
              fontSize: mobile ? 10 : 11,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.7,
            }}
          >
            <div style={{ color: "#00ccff", fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>ABOUT</div>
            You are trapped inside a procedural maze. Collect the required gems before the
            timer runs out — but watch out for patrolling <span style={{ color: "#ff4466" }}>red drones</span> that will drain
            your lives. Use the minimap in the top-right to navigate. Finish fast for a
            <span style={{ color: "#ffd700" }}> time bonus</span> on top of your gem score.
          </div>

          {/* Name input */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
              YOUR NAME
            </div>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => { setName(e.target.value.slice(0, 16).toUpperCase()); setNameError(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
              placeholder="ENTER NAME"
              maxLength={16}
              spellCheck={false}
              style={{
                width: "100%",
                background: nameError ? "rgba(255,60,60,0.1)" : "rgba(255,255,255,0.06)",
                border: nameError ? "2px solid #ff4466" : "2px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "#fff",
                fontSize: mobile ? 15 : 18,
                fontFamily: "'Courier New', monospace",
                fontWeight: "bold",
                letterSpacing: 3,
                padding: mobile ? "10px 14px" : "12px 16px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = nameError ? "#ff4466" : "#00ccff"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = nameError ? "#ff4466" : "rgba(255,255,255,0.15)"; }}
            />
            {nameError && (
              <div style={{ color: "#ff4466", fontSize: 10, marginTop: 5, letterSpacing: 1 }}>
                ⚠ Please enter your name to continue
              </div>
            )}
          </div>

          {/* Difficulty picker */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 3, marginBottom: 10 }}>
              SELECT DIFFICULTY
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {DIFFICULTIES.map((d) => {
                const dc = DIFFICULTY_CONFIGS[d];
                const isSelected = d === selected;
                return (
                  <button
                    key={d}
                    onClick={() => setSelected(d)}
                    style={{
                      flex: 1,
                      background: isSelected
                        ? `linear-gradient(135deg, ${dc.color}33, ${dc.color}22)`
                        : "rgba(255,255,255,0.04)",
                      border: isSelected ? `2px solid ${dc.color}` : "2px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      padding: mobile ? "10px 4px" : "14px 8px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      boxShadow: isSelected ? `0 0 16px ${dc.glow}` : "none",
                    }}
                  >
                    <div style={{ fontSize: mobile ? 18 : 22, marginBottom: 4 }}>{dc.icon}</div>
                    <div
                      style={{
                        color: isSelected ? dc.color : "rgba(255,255,255,0.5)",
                        fontSize: mobile ? 10 : 11,
                        fontWeight: "bold",
                        letterSpacing: 2,
                        fontFamily: "'Courier New', monospace",
                      }}
                    >
                      {dc.label}
                    </div>
                  </button>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 10,
                padding: "8px 12px",
                background: `${cfg.color}11`,
                border: `1px solid ${cfg.color}44`,
                borderRadius: 8,
                color: cfg.color,
                fontSize: 11,
                letterSpacing: 1,
              }}
            >
              {cfg.tagline}
            </div>
          </div>

          {/* Controls */}
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              padding: mobile ? "12px 14px" : "14px 18px",
              marginBottom: 20,
            }}
          >
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>
              CONTROLS
            </div>
            <div style={{ display: "grid", gap: 7 }}>
              {(mobile
                ? [
                    ["LEFT THUMB", "Joystick to move"],
                    ["RIGHT THUMB", "Drag to look"],
                    ["🔫 BUTTON", "Shoot — 2 hits to destroy drone"],
                  ]
                : [
                    ["WASD / ↑↓←→", "Move through the maze"],
                    ["MOUSE", "Click to lock, drag to look"],
                    ["CLICK / SPACE / F", "Shoot — 2 hits destroy a drone"],
                    ["MINIMAP", "Top-right — orange = chasing drone"],
                  ]
              ).map(([key, val]) => (
                <div key={key} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span
                    style={{
                      color: "#ffd700",
                      fontSize: 10,
                      letterSpacing: 1,
                      minWidth: mobile ? 88 : 108,
                      fontWeight: "bold",
                      flexShrink: 0,
                    }}
                  >
                    {key}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: mobile ? 10 : 11 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStart}
            style={{
              background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: mobile ? 14 : 15,
              fontWeight: "bold",
              letterSpacing: 4,
              padding: mobile ? "14px 40px" : "15px 48px",
              cursor: "pointer",
              textTransform: "uppercase",
              boxShadow: `0 0 28px ${cfg.glow}`,
              width: "100%",
              transition: "transform 0.15s",
              fontFamily: "'Courier New', monospace",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            START — {cfg.label}
          </button>
        </div>

        {/* RIGHT COLUMN: Leaderboard */ }
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div
            style={{
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,215,0,0.2)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "rgba(255,215,0,0.08)",
                borderBottom: "1px solid rgba(255,215,0,0.15)",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>🏆</span>
              <span style={{ color: "#ffd700", fontSize: 11, letterSpacing: 3, fontWeight: "bold" }}>
                LEADERBOARD
              </span>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginLeft: "auto" }}>
                GLOBAL
              </span>
            </div>

            {isLoading ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "rgba(255,255,255,0.25)",
                  fontSize: 11,
                  letterSpacing: 2,
                }}
              >
                <div style={{ marginBottom: 8, animation: "pulse 1s infinite" }}>⟳</div>
                LOADING SCORES…
              </div>
            ) : top15.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "rgba(255,255,255,0.25)",
                  fontSize: 11,
                  letterSpacing: 2,
                }}
              >
                NO SCORES YET
                <div style={{ marginTop: 8, fontSize: 10 }}>Be the first to escape the labyrinth!</div>
              </div>
            ) : (
              <div>
                {/* Column headers */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "28px 1fr 40px 60px 60px",
                    gap: "0 8px",
                    padding: "6px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {["#", "NAME", "D", "GEMS", "SCORE"].map((h) => (
                    <div key={h} style={{ color: "rgba(255,255,255,0.28)", fontSize: 9, letterSpacing: 2 }}>
                      {h}
                    </div>
                  ))}
                </div>

                {top15.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "28px 1fr 40px 60px 60px",
                      gap: "0 8px",
                      padding: "7px 14px",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background:
                        i === 0
                          ? "rgba(255,215,0,0.07)"
                          : i < 3
                          ? "rgba(255,255,255,0.03)"
                          : "transparent",
                      alignItems: "center",
                    }}
                  >
                    {/* Rank */}
                    <div
                      style={{
                        color: i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.3)",
                        fontSize: i < 3 ? 13 : 11,
                        fontWeight: "bold",
                      }}
                    >
                      {i === 0 ? "👑" : i + 1}
                    </div>

                    {/* Name */}
                    <div
                      style={{
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: "bold",
                        letterSpacing: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.name}
                      {!entry.won && (
                        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 9, marginLeft: 4 }}>✗</span>
                      )}
                    </div>

                    {/* Difficulty badge */}
                    <div
                      style={{
                        color: DIFF_BADGE[entry.difficulty],
                        fontSize: 9,
                        fontWeight: "bold",
                        letterSpacing: 1,
                        border: `1px solid ${DIFF_BADGE[entry.difficulty]}55`,
                        borderRadius: 4,
                        padding: "1px 4px",
                        textAlign: "center",
                      }}
                    >
                      {diffLabel(entry.difficulty)}
                    </div>

                    {/* Gems */}
                    <div style={{ color: "#ffd700", fontSize: 11, textAlign: "center" }}>
                      ◆ {entry.gems}
                    </div>

                    {/* Score */}
                    <div
                      style={{
                        color: i === 0 ? "#ffd700" : "#fff",
                        fontSize: 12,
                        fontWeight: "bold",
                        textAlign: "right",
                      }}
                    >
                      {entry.score.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer tip */}
            <div
              style={{
                padding: "8px 14px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.2)",
                fontSize: 9,
                letterSpacing: 1,
                textAlign: "center",
              }}
            >
              D = Difficulty · E / N / H &nbsp;|&nbsp; ✗ = did not escape
            </div>
          </div>
        </div>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.2); letter-spacing: 3px; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
      `}</style>
    </div>
  );
}
