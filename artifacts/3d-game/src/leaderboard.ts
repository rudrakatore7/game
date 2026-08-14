import type { Difficulty } from "./difficulty";

export interface LeaderboardEntry {
  name:       string;
  score:      number;
  difficulty: Difficulty;
  gems:       number;
  won:        boolean;
  date:       string;
}

const API = "/api/leaderboard"; 

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`${API}?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { entries: LeaderboardEntry[] };
    return data.entries ?? [];
  } catch {
    // Fallback: return nothing — UI shows empty state
    return [];
  }
}

export async function submitScore(
  entry: Omit<LeaderboardEntry, "date">
): Promise<{ rank: number; entries: LeaderboardEntry[] }> {
  try {
    const res = await fetch(API, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as { rank: number; entries: LeaderboardEntry[] };
  } catch {
    // Graceful degradation: return the entry as rank 0 with itself in list
    return {
      rank:    -1,
      entries: [{ ...entry, date: new Date().toLocaleDateString() }],
    };
  }
}
