export type Difficulty = "easy" | "normal" | "hard";

export interface DifficultyConfig {
  label: string;
  droneSpeedMult: number;
  lives: number;
  gemsRequired: number;
  gemPoints: number;
  hitPenalty: number;
  livesBonus: number;
  timeLimit: number;
  timeBonusPerSecond: number;
  color: string;
  glow: string;
  tagline: string;
  icon: string;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: "EASY",
    droneSpeedMult: 0.5,
    lives: 5,
    gemsRequired: 15,
    gemPoints: 80,
    hitPenalty: 20,
    livesBonus: 100,
    timeLimit: 300,
    timeBonusPerSecond: 2,
    color: "#00cc66",
    glow: "rgba(0,200,100,0.5)",
    tagline: "Slow drones · 15 gems · 5 lives · 5:00",
    icon: "🟢",
  },
  normal: {
    label: "NORMAL",
    droneSpeedMult: 1.0,
    lives: 3,
    gemsRequired: 25,
    gemPoints: 100,
    hitPenalty: 50,
    livesBonus: 200,
    timeLimit: 240,
    timeBonusPerSecond: 5,
    color: "#00aaff",
    glow: "rgba(0,150,255,0.5)",
    tagline: "Normal drones · 25 gems · 3 lives · 4:00",
    icon: "🔵",
  },
  hard: {
    label: "HARD",
    droneSpeedMult: 1.9,
    lives: 2,
    gemsRequired: 25,
    gemPoints: 150,
    hitPenalty: 100,
    livesBonus: 500,
    timeLimit: 180,
    timeBonusPerSecond: 10,
    color: "#ff4444",
    glow: "rgba(255,50,50,0.5)",
    tagline: "Fast drones · 25 gems · 2 lives · 3:00",
    icon: "🔴",
  },
};
