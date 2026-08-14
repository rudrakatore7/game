import { pgTable, serial, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaderboardTable = pgTable("leaderboard", {
  id:         serial("id").primaryKey(),
  name:       varchar("name",       { length: 16  }).notNull(),
  score:      integer("score").notNull(),
  difficulty: varchar("difficulty", { length: 10  }).notNull(),
  gems:       integer("gems").notNull(),
  won:        boolean("won").notNull(),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

export const insertLeaderboardSchema = createInsertSchema(leaderboardTable).omit({
  id: true,
  createdAt: true,
});

export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type LeaderboardRow    = typeof leaderboardTable.$inferSelect;
