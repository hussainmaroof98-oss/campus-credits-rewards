// -----------------------------------------------------------------------------
// CREDITS vs REPUTATION
// Leaderboards rank by REPUTATION (achievement ledger) — never by credits.
// Credits are spendable currency and have no effect on standing.
// Students set a visibility: public (name + rank), tier (badge only) or
// private (not listed, though their reputation still counts for their class).
// -----------------------------------------------------------------------------

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Crown, GraduationCap, Medal, Settings2, Trophy, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { loadSession, type StudentSession } from "@/lib/session";
import { tierClass, tierFor, type Visibility } from "@/lib/tiers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  ssr: false,
  component: LeaderboardPage,
  head: () => ({
    meta: [
      { title: "Leaderboard — CampCredit" },
      {
        name: "description",
        content:
          "See how your reputation ranks against classmates and how your section stacks up course-wide on CampCredit.",
      },
      { property: "og:title", content: "Leaderboard — CampCredit" },
      {
        property: "og:description",
        content: "Track your personal rank and your class rank on the CampCredit leaderboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Tab = "students" | "myclass" | "classes";

type StudentRow = {
  id: string;
  name: string;
  section: string;
  branch: string;
  year: number;
  credit_balance: number;
  reputation: number;
  personal_rank: number | null;
  visibility: Visibility;
};

type ClassRow = {
  id: string;
  section: string;
  branch: string;
  year: number;
  normalized_score: number;
  avg_points: number;
  student_count: number;
  rank: number;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function medalFor(rank: number) {
  if (rank === 1) return { Icon: Crown, cls: "text-metal-gold" };
  if (rank === 2) return { Icon: Medal, cls: "text-metal-silver" };
  if (rank === 3) return { Icon: Medal, cls: "text-metal-bronze" };
  return null;
}

function LeaderboardPage() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [tab, setTab] = useState<Tab>("students");

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      navigate({ to: "/login", replace: true });
      return;
    }
    setStudent(session);
  }, [navigate]);

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["leaderboard", "students"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_leaderboard");
      if (error) throw error;
      return (data ?? []) as StudentRow[];
    },
  });

  const { data: classes, isLoading: loadingClasses } = useQuery({
    queryKey: ["leaderboard", "classes"],
    queryFn: async () => {
      // Normalized by average reputation per student, so class size never gives an edge.
      const { data, error } = await supabase.rpc("class_leaderboard");
      if (error) throw error;
      return (data ?? []) as ClassRow[];
    },
  });

  const allRows = useMemo(() => students ?? [], [students]);
  const scoped = useMemo(() => {
    if (tab !== "myclass" || !student) return allRows;
    return allRows.filter(
      (r) =>
        r.section === student.section && r.branch === student.branch && r.year === student.year,
    );
  }, [allRows, tab, student]);

  // Tier percentiles are computed over everyone in scope (private students
  // included), but private students are never rendered as a row.
  const tiers = useMemo(() => {
    const map = new Map<string, ReturnType<typeof tierFor>>();
    scoped.forEach((r, i) => map.set(r.id, tierFor(i, scoped.length)));
    return map;
  }, [scoped]);

  const rows = useMemo(
    () => scoped.filter((r) => r.visibility !== "private" || r.id === student?.id),
    [scoped, student?.id],
  );

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const myIndex = rows.findIndex((r) => r.id === student?.id);
  const myRow = myIndex >= 0 ? rows[myIndex] : null;
  const leaderScore = Math.max(1, rows[0]?.reputation ?? 1);
  const classLabel = student ? `${student.branch.split(" ").pop()}-${student.section}` : "";

  const isLoading = tab === "classes" ? loadingClasses : loadingStudents;

  const podium = [top3[1], top3[0], top3[2]];
  const podiumHeights = ["h-16", "h-24", "h-12"];

  const displayName = (row: StudentRow) =>
    row.id === student?.id || row.visibility === "public" ? row.name : "Anonymous student";

  return (
    <main className="flex min-h-screen justify-center bg-black py-0 sm:py-8">
      <div className="relative flex w-full max-w-[390px] flex-col overflow-hidden bg-background sm:rounded-[36px] sm:border sm:border-border sm:shadow-[var(--shadow-frame)]">
        <div className="blob -left-24 -top-20 h-64 w-64 bg-primary/10" />
        <div className="blob -right-28 top-72 h-72 w-72 bg-accent/20" />

        <div className="relative flex-1 px-5 pb-16 pt-6">
          <header className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/" })}
              aria-label="Back to home"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface/80 text-muted-foreground transition-all duration-200 hover:-translate-x-0.5 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex-1">
              <h1 className="font-display text-xl font-bold tracking-tight">Leaderboard</h1>
              <p className="text-xs text-muted-foreground">Ranked by reputation</p>
            </div>
            <button
              onClick={() => navigate({ to: "/profile" })}
              aria-label="Leaderboard visibility settings"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface/80 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </header>

          {/* Segmented control */}
          <div className="relative mt-5 grid grid-cols-3 rounded-2xl border border-border bg-surface/70 p-1">
            <span
              className={cn(
                "absolute inset-y-1 left-1 w-[calc(33.333%-0.1667rem)] rounded-xl bg-accent/70 shadow-[var(--shadow-lift)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                tab === "myclass" && "translate-x-[calc(100%+0.25rem)]",
                tab === "classes" && "translate-x-[calc(200%+0.5rem)]",
              )}
            />
            {(
              [
                { key: "students", label: "Campus", Icon: Trophy },
                { key: "myclass", label: "My Class", Icon: GraduationCap },
                { key: "classes", label: "Classes", Icon: Users },
              ] as const
            ).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "relative z-10 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-medium transition-colors duration-200",
                  tab === key ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {tab === "myclass" && student && (
            <div className="animate-rise mt-4 flex items-center justify-between rounded-2xl border border-primary/40 bg-accent/40 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Your class
                </p>
                <p className="truncate font-display text-sm font-bold">
                  {classLabel} · Year {student.year}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-foreground">
                  {myIndex >= 0 ? `#${myIndex + 1}` : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">of {scoped.length} students</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="mt-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl border border-border bg-surface/50"
                  style={{ animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
          ) : tab !== "classes" ? (
            <>
              {/* Podium */}
              <section className="mt-6 animate-rise rounded-3xl border border-border bg-surface/60 px-3 pb-3 pt-5">
                 <div className="flex items-end justify-center gap-1.5 sm:gap-3">
                  {podium.map((p, i) =>
                    p ? (
                      <div key={p.id} className="flex w-1/3 flex-col items-center">
                        <span
                          className={cn(
                            "grid place-items-center rounded-full border font-display font-bold",
                            i === 1
                              ? "h-14 w-14 border-metal-gold/60 bg-accent/65 text-base text-foreground"
                              : "h-11 w-11 border-border bg-accent/50 text-sm text-foreground/90",
                          )}
                        >
                          {p.visibility === "public" || p.id === student?.id
                            ? initials(p.name)
                            : "?"}
                        </span>
                         <p className="mt-2 line-clamp-1 max-w-full text-center text-[10px] font-semibold sm:text-[11px]">
                          {p.visibility === "public" || p.id === student?.id
                            ? p.name.split(" ")[0]
                            : (tiers.get(p.id) ?? "Bronze")}
                        </p>
                         <p className="font-mono text-[10px] text-primary sm:text-[11px]">
                          {p.reputation.toLocaleString("en-IN")}
                        </p>
                        <div
                          className={cn(
                            "mt-2 w-full rounded-t-xl bg-gradient-to-t from-accent/15 to-primary/35 transition-all duration-500",
                            podiumHeights[i],
                          )}
                        >
                          <p className="pt-2 text-center font-display text-sm font-bold text-foreground/85">
                            {i === 1 ? 1 : i === 0 ? 2 : 3}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="w-1/3" />
                    ),
                  )}
                </div>
              </section>

              {/* Ranked list */}
              <section className="mt-4 space-y-2.5">
                {rest.map((row, i) => {
                  const rank = i + 4;
                  const mine = row.id === student?.id;
                  const anonymous = !mine && row.visibility === "tier";
                  const tier = tiers.get(row.id) ?? "Bronze";
                  return (
                    <article
                      key={row.id}
                      className={cn(
                        "animate-rise group relative overflow-hidden rounded-2xl border bg-surface/70 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[var(--shadow-lift)]",
                        mine ? "border-primary/60 bg-accent/40" : "border-border",
                      )}
                      style={{ animationDelay: `${i * 45}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 shrink-0 text-center font-display text-sm font-bold text-muted-foreground">
                          {anonymous ? "–" : rank}
                        </span>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-accent/50 font-display text-xs font-bold text-foreground/90">
                          {anonymous ? "?" : initials(row.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-tight">
                            {displayName(row)}
                            {mine && (
                              <span className="ml-2 rounded-full bg-primary/25 px-2 py-0.5 text-[10px] font-medium text-primary">
                                You
                              </span>
                            )}
                            {anonymous && (
                              <span
                                className={cn(
                                  "ml-2 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                  tierClass[tier],
                                )}
                              >
                                {tier}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {row.branch.split(" ").pop()}-{row.section} · Year {row.year}
                          </p>
                          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-input">
                            <span
                              className="block h-full rounded-full bg-gradient-to-r from-accent to-primary transition-[width] duration-700 ease-out"
                              style={{
                                width: `${Math.max(8, (row.reputation / leaderScore) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-bold text-foreground">
                          {row.reputation.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </article>
                  );
                })}
                {rows.length === 0 && (
                  <p className="rounded-2xl border border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">
                    No students ranked yet.
                  </p>
                )}
              </section>
            </>
          ) : (
            <section className="mt-6 space-y-2.5">
              {(classes ?? []).map((c, i) => {
                const mine =
                  student?.section === c.section &&
                  student?.branch === c.branch &&
                  student?.year === c.year;
                const medal = medalFor(i + 1);
                return (
                  <article
                    key={c.id}
                    className={cn(
                      "animate-rise flex items-center gap-3 rounded-2xl border bg-surface/70 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[var(--shadow-lift)]",
                      mine ? "border-primary/60 bg-accent/40" : "border-border",
                    )}
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-accent/50 text-primary">
                      {medal ? (
                        <medal.Icon className={cn("h-4 w-4", medal.cls)} />
                      ) : (
                        <span className="font-display text-xs font-bold">{i + 1}</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight">
                        {c.branch.split(" ").pop()}-{c.section}
                        {mine && (
                          <span className="ml-2 rounded-full bg-primary/25 px-2 py-0.5 text-[10px] font-medium text-primary">
                            Your class
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Year {c.year} · {Math.round(Number(c.avg_points)).toLocaleString("en-IN")} avg
                        reputation · {c.student_count} students
                      </p>

                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-input">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-accent to-primary transition-[width] duration-700 ease-out"
                          style={{ width: `${Math.min(100, Number(c.normalized_score))}%` }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-bold text-foreground">
                      {Math.round(Number(c.normalized_score))}
                    </span>
                  </article>
                );
              })}
              {(classes ?? []).length === 0 && (
                <p className="rounded-2xl border border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">
                  No classes ranked yet.
                </p>
              )}
            </section>
          )}
        </div>

        {/* Sticky "your rank" bar */}
        {tab !== "classes" && myRow && (
          <div className="sticky bottom-0 z-20 mt-auto border-t border-border bg-surface/85 px-5 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="w-6 text-center font-display text-sm font-bold text-primary">
                {myIndex + 1}
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full border border-primary/50 bg-accent/55 font-display text-xs font-bold text-foreground">
                {initials(myRow.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight">
                  Your position
                  {myRow.visibility !== "public" && (
                    <span className="ml-2 rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {myRow.visibility === "private" ? "Hidden from others" : "Tier only"}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {myIndex === 0
                    ? "Leading the campus"
                    : `${(rows[myIndex - 1]!.reputation - myRow.reputation).toLocaleString("en-IN")} reputation to rank ${myIndex}`}
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-foreground">
                {myRow.reputation.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
