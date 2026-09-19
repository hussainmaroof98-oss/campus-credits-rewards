// -----------------------------------------------------------------------------
// Leaderboard privacy tiers
// -----------------------------------------------------------------------------
// Students choose how they appear on leaderboards:
//   public  → full name + exact rank
//   tier    → only a Bronze/Silver/Gold/Platinum badge, no exact rank
//   private → not listed at all (their reputation still counts toward their
//             class aggregate, they just never appear as a personal row)
// Tier is a percentile of REPUTATION within the leaderboard being shown.
// -----------------------------------------------------------------------------

export type Visibility = "public" | "tier" | "private";

export type Tier = "Platinum" | "Gold" | "Silver" | "Bronze";

/** position is 0-indexed within the ranked list; total is the list length. */
export function tierFor(position: number, total: number): Tier {
  if (total <= 0) return "Bronze";
  const pct = (position + 1) / total;
  if (pct <= 0.1) return "Platinum";
  if (pct <= 0.35) return "Gold";
  if (pct <= 0.7) return "Silver";
  return "Bronze";
}

export const tierClass: Record<Tier, string> = {
  Platinum: "border-cream/50 bg-cream/15 text-cream",
  Gold: "border-sand/50 bg-sand/15 text-sand",
  Silver: "border-pale-blue/40 bg-pale-blue/10 text-pale-blue",
  Bronze: "border-border bg-white/5 text-muted-foreground",
};
