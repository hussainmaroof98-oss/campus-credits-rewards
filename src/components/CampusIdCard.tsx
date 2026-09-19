// -----------------------------------------------------------------------------
// CREDITS vs REPUTATION — the core rule of the app
// -----------------------------------------------------------------------------
// Reputation = your standing. Earned only through the achievement ledger
//   (academics, events, team bonuses, penalties). Drives personal rank,
//   class rank and the course-wide class score. It can NEVER be spent.
// Credits    = spendable currency. Earned through the point ledger and spent
//   on rewards. Spending credits never changes your standing.
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { ArrowUpRight, Cpu } from "lucide-react";

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-2xl px-3 py-2.5 glass">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/75">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold leading-none text-white">{value}</p>
    </div>
  );
}

export function CampusIdCard({
  name,
  subtitle,
  reputation: target,
  credits,
  delta,
  personalRank,
  classRank,
}: {
  name: string;
  subtitle: string;
  reputation: number;
  credits: number;
  delta: number;
  personalRank: string;
  classRank: string;
}) {
  const reputation = useCountUp(target);

  return (
    <div className="relative overflow-hidden rounded-[28px] card-hero p-5 pb-4">
      {/* single soft light sweep */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-[-40%] left-0 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/22 to-transparent" />
      </div>

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
            Digital Campus ID
          </p>
          <p className="mt-1 font-display text-sm font-medium text-cream">
            {name} · {subtitle}
          </p>
        </div>
        <div className="grid h-9 w-12 place-items-center rounded-lg border border-white/30 bg-white/25">
          <Cpu className="h-4 w-4 text-white/70" />
        </div>
      </div>

      {/* Primary number = reputation (your standing, what rank is based on) */}
      <div className="relative mt-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
          Reputation
        </p>
        <div className="mt-1 flex items-end gap-3">
          <span className="font-mono text-[44px] font-bold leading-none tabular-nums text-cream drop-shadow-[0_1px_4px_rgba(30,40,55,0.22)]">
            {reputation.toLocaleString("en-IN")}
          </span>
          <span className="mb-1.5 inline-flex items-center gap-0.5 rounded-full bg-white/22 px-2 py-1 text-[11px] font-semibold text-white">
            <ArrowUpRight className="h-3 w-3" />
            {delta > 0 ? `+${delta}` : delta} this week
          </span>
        </div>
        {/* Secondary, clearly separate: spendable credits */}
        <p className="mt-2 text-[12px] font-medium text-white/80">
          Spendable credits ·{" "}
          <span className="font-mono font-bold text-cream">
            {credits.toLocaleString("en-IN")}
          </span>
        </p>
      </div>

      <div className="relative mt-5 flex gap-2.5">
        <StatChip label="Personal rank" value={personalRank} />
        <StatChip label="Class rank" value={classRank} />
      </div>
    </div>
  );
}
