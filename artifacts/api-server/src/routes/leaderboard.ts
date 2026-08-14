import { Router } from "express";
import { db, leaderboardTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

const TOP_N  = 100;
const LIMIT  = 20;

// GET /api/leaderboard?limit=N  — returns top scores
router.get("/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || LIMIT, TOP_N);
    const rows = await db
      .select()
      .from(leaderboardTable)
      .orderBy(desc(leaderboardTable.score))
      .limit(limit);

    const entries = rows.map((r) => ({
      name:       r.name,
      score:      r.score,
      difficulty: r.difficulty,
      gems:       r.gems,
      won:        r.won,
      date:       r.createdAt.toLocaleDateString(),
    }));

    res.json({ entries });
  } catch (err) {
    req.log.error({ err }, "leaderboard GET failed");
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// POST /api/leaderboard  — submit a score
// Body: { name, score, difficulty, gems, won }
router.post("/leaderboard", async (req, res) => {
  try {
    const { name, score, difficulty, gems, won } = req.body as {
      name: string;
      score: number;
      difficulty: string;
      gems: number;
      won: boolean;
    };

    if (
      typeof name       !== "string" || !name.trim() ||
      typeof score      !== "number" ||
      typeof difficulty !== "string" ||
      typeof gems       !== "number" ||
      typeof won        !== "boolean"
    ) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }

    const sanitised = {
      name:       name.trim().slice(0, 16).toUpperCase(),
      score:      Math.max(0, Math.floor(score)),
      difficulty: ["easy","normal","hard"].includes(difficulty) ? difficulty : "normal",
      gems:       Math.max(0, Math.floor(gems)),
      won,
    };

    const [inserted] = await db
      .insert(leaderboardTable)
      .values(sanitised)
      .returning();

    // Compute rank: how many rows have a higher score?
    const allRows = await db
      .select()
      .from(leaderboardTable)
      .orderBy(desc(leaderboardTable.score))
      .limit(TOP_N);

    const rank = allRows.findIndex((r) => r.id === inserted.id);

    const entries = allRows.map((r) => ({
      name:       r.name,
      score:      r.score,
      difficulty: r.difficulty,
      gems:       r.gems,
      won:        r.won,
      date:       r.createdAt.toLocaleDateString(),
    }));

    res.status(201).json({ rank, entries });
  } catch (err) {
    req.log.error({ err }, "leaderboard POST failed");
    res.status(500).json({ error: "Failed to save score" });
  }
});

export default router;
