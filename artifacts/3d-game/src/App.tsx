import { useState, useCallback, useRef, useEffect } from "react";
import Game from "./components/Game";
import StartScreen from "./components/StartScreen";
import GameOverScreen from "./components/GameOverScreen";
import { fetchLeaderboard, submitScore } from "./leaderboard";
import type { LeaderboardEntry } from "./leaderboard";
import type { Difficulty } from "./difficulty";
import { DIFFICULTY_CONFIGS } from "./difficulty";

type GameState = "start" | "playing" | "gameover";
export default function App() {
  const [gameState,   setGameState]   = useState<GameState>("start");
  const [difficulty,  setDifficulty]  = useState<Difficulty>("normal");
  const [playerName,  setPlayerName]  = useState("");
  const [lastScore,   setLastScore]   = useState(0);
  const [lastCollected, setLastCollected] = useState(0);
  const [lastWon,     setLastWon]     = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading,   setLbLoading]   = useState(true);
  const [newEntryIndex, setNewEntryIndex] = useState(-1);

  const difficultyRef = useRef<Difficulty>("normal");
  const nameRef       = useRef("");

  // Fetch leaderboard on mount and when returning to start screen
  const refreshLeaderboard = useCallback(async () => {
    setLbLoading(true);
    const entries = await fetchLeaderboard(20);
    setLeaderboard(entries);
    setLbLoading(false);
  }, []);

  useEffect(() => {
    refreshLeaderboard();
  }, [refreshLeaderboard]);

  const handleStart = useCallback((diff: Difficulty, name: string) => {
    setPlayerName(name);
    setDifficulty(diff);
    difficultyRef.current = diff;
    nameRef.current = name;
    setGameState("playing");
  }, []);

  const handleGameOver = useCallback(
    async (score: number, collected: number, won: boolean) => {
      setLastScore(score);
      setLastCollected(collected);
      setLastWon(won);

      // Submit to global leaderboard
      const result = await submitScore({
        name:       nameRef.current || "UNKNOWN",
        score,
        difficulty: difficultyRef.current,
        gems:       collected,
        won,
      });

      setLeaderboard(result.entries);
      setNewEntryIndex(result.rank);
      setGameState("gameover");
    },
    []
  );

  const handleRestart = useCallback(() => {
    refreshLeaderboard();
    setGameState("start");
  }, [refreshLeaderboard]);

  const cfg = DIFFICULTY_CONFIGS[difficulty];

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#000" }}>
      {gameState === "start" && (
        <StartScreen
          onStart={handleStart}
          leaderboard={leaderboard}
          isLoading={lbLoading}
          initialName={playerName}
        />
      )}
      {gameState === "playing" && (
        <Game key={Date.now()} difficulty={difficulty} onGameOver={handleGameOver} />
      )}
      {gameState === "gameover" && (
        <GameOverScreen
          playerName={playerName}
          score={lastScore}
          collected={lastCollected}
          gemsRequired={cfg.gemsRequired}
          won={lastWon}
          difficulty={difficulty}
          leaderboard={leaderboard}
          newEntryIndex={newEntryIndex}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
