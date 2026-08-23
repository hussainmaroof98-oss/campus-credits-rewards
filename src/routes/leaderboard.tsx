import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Crown, GraduationCap, Medal, Trophy, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { loadSession, type StudentSession } from "@/lib/session";
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
          "See how you rank against classmates and how your section stacks up course-wide on CampCredit.",
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
  personal_rank: number | null;
};

type ClassRow = {
  id: string;
  section: string;
  branch: string;
  year: number;
  normalized_score: number;
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
  if (rank === 1) return { Icon: Crown, cls: "text-sand" };
  if (rank === 2) return { Icon: Medal, cls: "text-cream/80" };
  if (rank === 3) return { Icon: Medal, cls: "text-teal-light" };
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
      const { data, error } = await supabase
        .from("classes")
        .select("id, section, branch, year, normalized_score")
        .order("normalized_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClassRow[];
    },
  });

  const allRows = useMemo(() => students ?? [], [students]);
  const rows = useMemo(() => {
    if (tab !== "myclass" || !student) return allRows;
    return allRows.filter(
      (r) =>
        r.section === student.section &&
        r.branch === student.branch &&
        r.year === student.year,
    );
  }, [allRows, tab, student]);
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const myIndex = rows.findIndex((r) => r.id === student?.id);
  const myRow = myIndex >= 0 ? rows[myIndex] : null;
  const leaderBalance = rows[0]?.credit_balance ?? 1;
  const classLabel = student
    ? `${student.branch.split(" ").pop()}-${student.section}`
    : "";

  const isLoading = tab === "classes" ? loadingClasses : loadingStudents;

  // Podium display order: 2nd, 1st, 3rd
  const podium = [top3[1], top3[0], top3[2]];
  const podiumHeights = ["h-16", "h-24", "h-12"];

  return (
    <main className="flex min-h-screen justify-center bg-[oklch(0.278_0.026_258)] py-0 sm:py-8">
      <div className="relative flex w-full max-w-[390px] flex-col overflow-hidden bg-background sm:rounded-[36px] sm:border sm:border-border sm:shadow-[0_40px_120px_-40px_rgba(0,0,0,0.7)]">
        <div className="blob -left-24 -top-20 h-64 w-64 bg-teal/12" />
        <div className="blob -right-28 top-72 h-72 w-72 bg-sand/8" />

        <div className="relative flex-1 px-5 pb-16 pt-6">
          <header className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/" })}
              aria-label="Back to home"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface/80 text-muted-foreground transition-all duration-200 hover:-translate-x-0.5 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight">Leaderboard</h1>
              <p className="text-xs text-muted-foreground">Updated live from campus activity</p>
            </div>
          </header>

          {/* Segmented control */}
          <div className="relative mt-5 grid grid-cols-3 rounded-2xl border border-border bg-surface/70 p-1">
            <span
              className={cn(
                "absolute inset-y-1 left-1 w-[calc(33.333%-0.1667rem)] rounded-xl bg-teal-deep/45 shadow-[var(--shadow-lift)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
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
            <div className="animate-rise mt-4 flex items-center justify-between rounded-2xl border border-teal/40 bg-teal-deep/20 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Your class
                </p>
                <p className="truncate font-display text-sm font-bold">
                  {classLabel} · Year {student.year}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-cream">
                  {myIndex >= 0 ? `#${myIndex + 1}` : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">of {rows.length} students</p>
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
                <div className="flex items-end justify-center gap-3">
                  {podium.map((p, i) =>
                    p ? (
                      <div key={p.id} className="flex w-1/3 flex-col items-center">
                        <span
                          className={cn(
                            "grid place-items-center rounded-full border font-display font-bold",
                            i === 1
                              ? "h-14 w-14 border-sand/60 bg-teal-deep/40 text-base text-cream"
                              : "h-11 w-11 border-border bg-teal-deep/25 text-sm text-cream/90",
                          )}
                        >
                          {initials(p.name)}
                        </span>
                        <p className="mt-2 line-clamp-1 text-center text-[11px] font-semibold">
                          {p.name.split(" ")[0]}
                        </p>
                        <p className="font-mono text-[11px] text-sand">
                          {p.credit_balance.toLocaleString("en-IN")}
                        </p>
                        <div
                          className={cn(
                            "mt-2 w-full rounded-t-xl bg-gradient-to-t from-teal-deep/15 to-teal/35 transition-all duration-500",
                            podiumHeights[i],
                          )}
                        >
                          <p className="pt-2 text-center font-display text-sm font-bold text-cream/85">
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
                  return (
                    <article
                      key={row.id}
                      className={cn(
                        "animate-rise group relative overflow-hidden rounded-2xl border bg-surface/70 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal/45 hover:shadow-[var(--shadow-lift)]",
                        mine ? "border-teal/60 bg-teal-deep/20" : "border-border",
                      )}
                      style={{ animationDelay: `${i * 45}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 shrink-0 text-center font-display text-sm font-bold text-muted-foreground">
                          {rank}
                        </span>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-teal-deep/25 font-display text-xs font-bold text-cream/90">
                          {initials(row.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-tight">
                            {row.name}
                            {mine && (
                              <span className="ml-2 rounded-full bg-teal/25 px-2 py-0.5 text-[10px] font-medium text-teal-light">
                                You
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {row.branch.split(" ").pop()}-{row.section} · Year {row.year}
                          </p>
                          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-input">
                            <span
                              className="block h-full rounded-full bg-gradient-to-r from-teal-deep to-sand transition-[width] duration-700 ease-out"
                              style={{
                                width: `${Math.max(8, (row.credit_balance / leaderBalance) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-bold text-cream">
                          {row.credit_balance.toLocaleString("en-IN")}
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
                      "animate-rise flex items-center gap-3 rounded-2xl border bg-surface/70 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal/45 hover:shadow-[var(--shadow-lift)]",
                      mine ? "border-teal/60 bg-teal-deep/20" : "border-border",
                    )}
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-teal-deep/25 text-teal-light">
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
                          <span className="ml-2 rounded-full bg-teal/25 px-2 py-0.5 text-[10px] font-medium text-teal-light">
                            Your class
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Year {c.year}</p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-input">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-teal-deep to-sand transition-[width] duration-700 ease-out"
                          style={{ width: `${Math.min(100, Number(c.normalized_score))}%` }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-bold text-cream">
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
              <span className="w-6 text-center font-display text-sm font-bold text-teal-light">
                {myIndex + 1}
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full border border-teal/50 bg-teal-deep/30 font-display text-xs font-bold text-cream">
                {initials(myRow.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight">Your position</p>
                <p className="text-[11px] text-muted-foreground">
                  {myIndex === 0
                    ? "Leading the campus"
                    : `${(rows[myIndex - 1]!.credit_balance - myRow.credit_balance).toLocaleString("en-IN")} pts to rank ${myIndex}`}
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-cream">
                {myRow.credit_balance.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
