// -----------------------------------------------------------------------------
// CREDITS vs REPUTATION
// Reputation (achievements ledger) = standing, drives rank, cannot be spent.
// Credits (point ledger) = spendable currency for rewards.
// This page shows the student's own Achievement Ledger — including their
// private penalties, which nobody else can ever see.
// -----------------------------------------------------------------------------

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldAlert,
  Shield,
  Trophy,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { loadSession, type StudentSession } from "@/lib/session";
import type { Visibility } from "@/lib/tiers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  ssr: false,
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Your profile — CampCredit" },
      {
        name: "description",
        content:
          "Your CampCredit achievement ledger: every citation behind your reputation, plus your leaderboard privacy setting.",
      },
      { property: "og:title", content: "Your profile — CampCredit" },
      {
        property: "og:description",
        content: "See every achievement behind your reputation and control how you appear on leaderboards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Achievement = {
  id: string;
  points: number;
  citation: string;
  source: string;
  is_private: boolean;
  created_at: string;
};

const sourceMeta: Record<string, { label: string; Icon: typeof Trophy }> = {
  academic: { label: "Academic", Icon: GraduationCap },
  event: { label: "Event", Icon: Trophy },
  team_bonus: { label: "Team bonus", Icon: Users },
  penalty: { label: "Penalty", Icon: ShieldAlert },
};

const visibilityOptions: { key: Visibility; label: string; hint: string; Icon: typeof Eye }[] = [
  { key: "public", label: "Public", hint: "Name and exact rank are visible", Icon: Eye },
  { key: "tier", label: "Tier only", hint: "Only your Bronze–Platinum badge shows", Icon: Shield },
  { key: "private", label: "Private", hint: "You never appear in leaderboard lists", Icon: EyeOff },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [student, setStudent] = useState<StudentSession | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      navigate({ to: "/login", replace: true });
      return;
    }
    setStudent(session);
  }, [navigate]);

  const { data: stats } = useQuery({
    queryKey: ["stats", student?.id],
    enabled: Boolean(student?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_stats", { p_student_id: student!.id });
      if (error) throw error;
      return (data ?? [])[0] ?? null;
    },
  });

  const { data: achievements, isLoading } = useQuery({
    queryKey: ["achievements", student?.id],
    enabled: Boolean(student?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_achievements", { p_student_id: student!.id });
      if (error) throw error;
      return (data ?? []) as Achievement[];
    },
  });

  const setVisibility = useMutation({
    mutationFn: async (visibility: Visibility) => {
      const { error } = await supabase.rpc("student_set_visibility", {
        p_student_id: student!.id,
        p_visibility: visibility,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stats", student?.id] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });

  const visibility = (stats?.visibility ?? "public") as Visibility;

  return (
    <main className="flex min-h-screen justify-center bg-[oklch(0.278_0.026_258)] py-0 sm:py-8">
      <div className="relative w-full max-w-[390px] overflow-hidden bg-background sm:rounded-[36px] sm:border sm:border-border sm:shadow-[0_40px_120px_-40px_rgba(0,0,0,0.7)]">
        <div className="blob -left-24 -top-20 h-64 w-64 bg-teal/12" />
        <div className="blob -right-28 top-72 h-72 w-72 bg-sand/8" />

        <div className="relative px-5 pb-16 pt-6">
          <header className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/" })}
              aria-label="Back to home"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface/80 text-muted-foreground transition-all duration-200 hover:-translate-x-0.5 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight">Your profile</h1>
              <p className="text-xs text-muted-foreground">
                {student ? `${student.name} · ${student.enrollment_number}` : "Loading…"}
              </p>
            </div>
          </header>

          {/* Standing vs spendable, spelled out */}
          <section className="mt-5 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-teal/40 bg-teal-deep/20 p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Reputation
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-cream">
                {(stats?.reputation ?? 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Drives your rank</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface/70 p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Credits
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-sand">
                {(stats?.credit_balance ?? 0).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Spendable on rewards</p>
            </div>
          </section>

          {/* Leaderboard visibility */}
          <section className="mt-5 rounded-3xl border border-border bg-surface/70 p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Leaderboard visibility
            </h2>
            <div className="mt-3 space-y-2">
              {visibilityOptions.map(({ key, label, hint, Icon }) => (
                <button
                  key={key}
                  onClick={() => setVisibility.mutate(key)}
                  disabled={setVisibility.isPending}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200",
                    visibility === key
                      ? "border-teal/60 bg-teal-deep/25"
                      : "border-border bg-white/5 hover:border-teal/40",
                  )}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-deep/30 text-teal-light">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{label}</span>
                    <span className="block text-[11px] text-muted-foreground">{hint}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Whatever you choose, your reputation still counts toward your class score.
            </p>
          </section>

          {/* Achievement ledger */}
          <section className="mt-5 rounded-3xl border border-border bg-surface/60 p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Achievement ledger
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Every citation behind your reputation. Penalties are private to you.
            </p>

            {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}

            <ol className="mt-4 space-y-2.5">
              {(achievements ?? []).map((a, i) => {
                const meta = sourceMeta[a.source] ?? { label: a.source, Icon: Trophy };
                const negative = a.points < 0;
                return (
                  <li
                    key={a.id}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className={cn(
                      "animate-rise flex items-start gap-3 rounded-2xl border p-3",
                      negative
                        ? "border-destructive/40 bg-destructive/10"
                        : "border-border bg-white/5",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full border",
                        negative
                          ? "border-destructive/40 bg-destructive/15 text-destructive"
                          : "border-teal/40 bg-teal-deep/20 text-teal-light",
                      )}
                    >
                      <meta.Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight">{a.citation}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        {meta.label} · {formatDate(a.created_at)}
                        {a.is_private && (
                          <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                            Private — only you
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-sm font-bold",
                        negative ? "text-destructive" : "text-cream",
                      )}
                    >
                      {a.points > 0 ? "+" : ""}
                      {a.points}
                    </span>
                  </li>
                );
              })}
              {!isLoading && (achievements ?? []).length === 0 && (
                <p className="rounded-2xl border border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">
                  No achievements yet — join an event to start building your standing.
                </p>
              )}
            </ol>
          </section>
        </div>
      </div>
    </main>
  );
}
