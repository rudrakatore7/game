import { useMemo } from "react";
import { isMobile } from "../hooks/useMobileControls";
import type { Difficulty } from "../difficulty";
import { DIFFICULTY_CONFIGS } from "../difficulty";
import type { LeaderboardEntry } from "../leaderboard";

const DIFF_BADGE: Record<string, string> = { easy: "#00cc66", normal: "#00aaff", hard: "#ff4444" };
function diffLabel(d: string) { return d.toUpperCase()[0]; }

interface GameOverScreenProps {
  playerName: string;
  score: number;
  collected: number;
  gemsRequired: number;
  won: boolean;
  difficulty: Difficulty;
  leaderboard: LeaderboardEntry[];
  newEntryIndex: number;
  onRestart: () => void;
}

export default function GameOverScreen({
  playerName, score, collected, gemsRequired, won, difficulty,
  leaderboard, newEntryIndex, onRestart,
}: GameOverScreenProps) {
  const mobile = useMemo(() => isMobile(), []);
  const cfg = DIFFICULTY_CONFIGS[difficulty];
  const top10 = leaderboard.slice(0, 10);
  // Ensure the new entry is visible even if outside top-10
  const showExtra = newEntryIndex >= 10 && newEntryIndex < leaderboard.length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: won
          ? "radial-gradient(ellipse at center, #001a00 0%, #000 100%)"
          : "radial-gradient(ellipse at center, #1a0000 0%, #000 100%)",
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
          maxWidth: mobile ? 480 : 800,
          padding: mobile ? "24px 16px 36px" : "36px 32px 48px",
          display: "flex",
          flexDirection: mobile ? "column" : "row",
          gap: mobile ? 24 : 32,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT: Result */ }
        <div style={{ flex: "1 1 280px", minWidth: 0, textAlign: "center" }}>
          <div style={{ fontSize: mobile ? 52 : 64, marginBottom: 8 }}>{won ? "🏆" : "💀"}</div>

          {playerName && (
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, letterSpacing: 3, marginBottom: 4 }}>
              {playerName}
            </div>
          )}

          <h1
            style={{
              color: won ? "#00ff88" : "#ff4466",
              fontSize: mobile ? 32 : 40,
              fontWeight: "bold",
              letterSpacing: 4,
              textShadow: won ? "0 0 30px rgba(0,255,136,0.6)" : "0 0 30px rgba(255,68,102,0.6)",
              margin: "0 0 10px",
            }}
          >
            {won ? "ESCAPED!" : "GAME OVER"}
          </h1>

          {/* Difficulty badge */}
          <div
            style={{
              display: "inline-block",
              background: `${cfg.color}22`,
              border: `1px solid ${cfg.color}66`,
              borderRadius: 20,
              padding: "4px 14px",
              color: cfg.color,
              fontSize: 10,
              letterSpacing: 3,
              marginBottom: 20,
            }}
          >
            {cfg.icon} {cfg.label}
          </div>

          {/* Score breakdown */}
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: mobile ? "16px 18px" : "18px 24px",
              marginBottom: 20,
              textAlign: "left",
            }}
          >
            {[
              ["SCORE", score.toLocaleString()],
              ["GEMS COLLECTED", `${collected} / ${gemsRequired} required`],
              [
                "RANK",
                newEntryIndex === 0
                  ? "👑 #1 ALL TIME!"
                  : newEntryIndex < 0
                  ? "—"
                  : `#${newEntryIndex + 1} on leaderboard`,
              ],
            ].map(([label, val]) => (
              <div
                key={label as string}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "9px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: mobile ? 11 : 12, letterSpacing: 2 }}>
                  {label}
                </span>
                <span
                  style={{
                    color: label === "RANK" && newEntryIndex === 0 ? "#ffd700" : "#fff",
                    fontSize: mobile ? 14 : 16,
                    fontWeight: "bold",
                  }}
                >
                  {val}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={onRestart}
            style={{
              background: won
                ? "linear-gradient(135deg, #006633, #00cc66)"
                : "linear-gradient(135deg, #660022, #cc0044)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: mobile ? 14 : 15,
              fontWeight: "bold",
              letterSpacing: 4,
              padding: mobile ? "14px 40px" : "15px 48px",
              cursor: "pointer",
              textTransform: "uppercase",
              width: "100%",
              boxShadow: won
                ? "0 0 28px rgba(0,200,100,0.4)"
                : "0 0 28px rgba(200,0,50,0.4)",
              fontFamily: "'Courier New', monospace",
            }}
          >
            PLAY AGAIN
          </button>
        </div>

        {/* RIGHT: Leaderboard */ }
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <div
            style={{
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,215,0,0.2)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "rgba(255,215,0,0.08)",
                borderBottom: "1px solid rgba(255,215,0,0.15)",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>🏆</span>
              <span style={{ color: "#ffd700", fontSize: 11, letterSpacing: 3, fontWeight: "bold" }}>
                LEADERBOARD
              </span>
            </div>

            {/* Column headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "26px 1fr 34px 50px 60px",
                gap: "0 6px",
                padding: "6px 12px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {["#", "NAME", "D", "GEM", "SCORE"].map((h) => (
                <div key={h} style={{ color: "rgba(255,255,255,0.28)", fontSize: 9, letterSpacing: 1 }}>
                  {h}
                </div>
              ))}
            </div>

            {top10.map((entry, i) => {
              const isNew = i === newEntryIndex;
              return (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "26px 1fr 34px 50px 60px",
                    gap: "0 6px",
                    padding: "7px 12px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: isNew
                      ? won
                        ? "rgba(0,255,136,0.1)"
                        : "rgba(255,68,102,0.1)"
                      : i === 0
                      ? "rgba(255,215,0,0.06)"
                      : "transparent",
                    alignItems: "center",
                    outline: isNew ? `1px solid ${won ? "#00ff8844" : "#ff446644"}` : "none",
                  }}
                >
                  <div
                    style={{
                      color: i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.3)",
                      fontSize: i < 3 ? 13 : 11,
                      fontWeight: "bold",
                    }}
                  >
                    {i === 0 ? "👑" : i + 1}
                  </div>
                  <div
                    style={{
                      color: isNew ? (won ? "#00ff88" : "#ff4466") : "#fff",
                      fontSize: 11,
                      fontWeight: isNew ? "bold" : "normal",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isNew ? "▶ " : ""}{entry.name}
                    {!entry.won && <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 9, marginLeft: 3 }}>✗</span>}
                  </div>
                  <div
                    style={{
                      color: DIFF_BADGE[entry.difficulty],
                      fontSize: 9,
                      fontWeight: "bold",
                      border: `1px solid ${DIFF_BADGE[entry.difficulty]}55`,
                      borderRadius: 3,
                      padding: "1px 3px",
                      textAlign: "center",
                    }}
                  >
                    {diffLabel(entry.difficulty)}
                  </div>
                  <div style={{ color: "#ffd700", fontSize: 10, textAlign: "center" }}>
                    ◆ {entry.gems}
                  </div>
                  <div
                    style={{
                      color: isNew ? (won ? "#00ff88" : "#ff4466") : i === 0 ? "#ffd700" : "#fff",
                      fontSize: 11,
                      fontWeight: "bold",
                      textAlign: "right",
                    }}
                  >
                    {entry.score.toLocaleString()}
                  </div>
                </div>
              );
            })}

            {/* Show the new entry if it's outside top-10 */}
            {showExtra && (
              <>
                <div style={{ padding: "4px 12px", color: "rgba(255,255,255,0.2)", fontSize: 9, textAlign: "center" }}>
                  · · ·
                </div>
                {(() => {
                  const entry = leaderboard[newEntryIndex];
                  return (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "26px 1fr 34px 50px 60px",
                        gap: "0 6px",
                        padding: "7px 12px",
                        background: won ? "rgba(0,255,136,0.1)" : "rgba(255,68,102,0.1)",
                        alignItems: "center",
                        outline: `1px solid ${won ? "#00ff8844" : "#ff446644"}`,
                      }}
                    >
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                        {newEntryIndex + 1}
                      </div>
                      <div style={{ color: won ? "#00ff88" : "#ff4466", fontSize: 11, fontWeight: "bold" }}>
                        ▶ {entry.name}
                      </div>
                      <div style={{ color: DIFF_BADGE[entry.difficulty], fontSize: 9, fontWeight: "bold", border: `1px solid ${DIFF_BADGE[entry.difficulty]}55`, borderRadius: 3, padding: "1px 3px", textAlign: "center" }}>
                        {diffLabel(entry.difficulty)}
                      </div>
                      <div style={{ color: "#ffd700", fontSize: 10, textAlign: "center" }}>◆ {entry.gems}</div>
                      <div style={{ color: won ? "#00ff88" : "#ff4466", fontSize: 11, fontWeight: "bold", textAlign: "right" }}>
                        {entry.score.toLocaleString()}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            <div
              style={{
                padding: "7px 12px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.2)",
                fontSize: 9,
                textAlign: "center",
                letterSpacing: 1,
              }}
            >
              ▶ = YOUR RUN &nbsp;|&nbsp; ✗ = did not escape
            </div>
          </div>
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
      `}</style>
    </div>
  );
}
