export function ProgressRing({ value, rank }: { value: number; rank: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0">
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="60%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--input)" strokeWidth="7" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`}
        transform="rotate(-90 40 40)"
      />
      <text
        x="40"
        y="44"
        textAnchor="middle"
        className="fill-foreground font-display"
        fontSize="20"
        fontWeight="700"
      >
        {rank}
      </text>
    </svg>
  );
}
