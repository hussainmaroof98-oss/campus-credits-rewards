// -----------------------------------------------------------------------------
// CREDITS vs REPUTATION — the core rule of the app
// Reputation = standing (achievements ledger only) → drives every rank.
// Credits    = spendable currency (point ledger only) → spent on rewards.
// Spending credits never lowers standing; a penalty never removes credits.
// -----------------------------------------------------------------------------

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Gift,
  CalendarDays,
  Trophy,
  Droplets,
  GraduationCap,
  LogOut,
  Crown,
  ScrollText,
} from "lucide-react";

import avatar from "@/assets/avatar-aarav.jpg";
import { CampusIdCard } from "@/components/CampusIdCard";
import { ProgressRing } from "@/components/ProgressRing";
import { supabase } from "@/integrations/supabase/client";
import { clearSession, loadSession, type StudentSession } from "@/lib/session";


export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
  head: () => ({
    meta: [
      { title: "CampCredit — Campus rewards for college students" },
      {
        name: "description",
        content:
          "Earn credits for academics, events and campus spending. Climb class leaderboards and redeem real rewards.",
      },
      { property: "og:title", content: "CampCredit — Campus rewards for college students" },
      {
        property: "og:description",
        content: "Earn credits, climb your class leaderboard, redeem real rewards.",
      },
    ],
  }),
});

const actions = [
  { label: "Redeem", icon: Gift, to: "/redeem" as const },
  { label: "Events", icon: CalendarDays, to: "/events" as const },
  { label: "Leaderboard", icon: Trophy, to: "/leaderboard" as const },
  { label: "Achievements", icon: ScrollText, to: "/profile" as const },
  { label: "Campus Plus", icon: Crown, to: "/campus-plus" as const },
];


const sourceIcon = {
  academic: GraduationCap,
  event: Trophy,
  spend: Droplets,
} as const;

function timeAgo(iso: string) {
  const days = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days === 1) return "1 day ago";
  if (days < 14) return `${days} days ago`;
  return `${Math.round(days / 7)} weeks ago`;
}

function Home() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentSession | null>(null);

  // Client-side auth gate (no SSR / server loaders — this is a static SPA build).
  useEffect(() => {
    const session = loadSession();
    if (!session) {
      navigate({ to: "/login", replace: true });
      return;
    }
    setStudent(session);
  }, [navigate]);

  const { data: ledger } = useQuery({
    queryKey: ["ledger", student?.id],
    enabled: Boolean(student?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_ledger")
        .select("id, source, points, description, created_at")
        .eq("student_id", student!.id)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  // All ranks / balances / class score are computed from the point ledger server-side.
  const { data: stats } = useQuery({
    queryKey: ["stats", student?.id],
    enabled: Boolean(student?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_stats", {
        p_student_id: student!.id,
      });
      if (error) throw error;
      return (data ?? [])[0] ?? null;
    },
  });

  const { data: isPlus } = useQuery({
    queryKey: ["campus-plus", student?.id],
    enabled: Boolean(student?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_campus_plus_status", {
        p_student_id: student!.id,
      });
      if (error) throw error;
      return Boolean(data?.[0]?.is_campus_plus);
    },
  });

  function signOut() {
    clearSession();
    navigate({ to: "/login", replace: true });
  }

  const firstName = (student?.name || "").split(" ")[0] || "there";
  const classScore = Number(stats?.normalized_score ?? 0);
  const weekDelta = stats?.week_delta ?? 0;
  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
  };


  return (
    <main className="flex min-h-screen justify-center bg-black py-0 sm:py-8">
      <div className="relative w-full max-w-[390px] overflow-hidden bg-background sm:rounded-[36px] sm:border sm:border-border sm:shadow-[var(--shadow-frame)]">
        <div className="blob -left-24 -top-16 h-64 w-64 bg-primary/10" />
        <div className="blob -right-24 top-64 h-72 w-72 bg-accent/20" />

        <div className="relative px-5 pb-14 pt-6">
          <header className="flex items-center justify-between">
            <span className="font-display text-xl font-bold tracking-tight">CampCredit</span>
            <div className="flex items-center gap-2">
              <button
                onClick={signOut}
                aria-label="Sign out"
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface/80 text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <img
                src={avatar}
                alt={`${student?.name ?? "Student"} profile`}
                width={512}
                height={512}
                className="h-10 w-10 rounded-full border border-border object-cover"
              />
            </div>
          </header>

          <section className="mt-6 animate-rise">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold">Hi, {firstName}</h1>
              {isPlus && (
                <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Crown className="h-3 w-3" />
                  Campus Plus
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {student
                ? `${student.branch} · Section ${student.section} · Year ${student.year}`
                : "Loading your campus profile…"}
            </p>
          </section>

          <section className="mt-5">
            <CampusIdCard
              name={student?.name || "—"}
              subtitle={
                student ? `${student.branch.split(" ").pop()}-${student.section}` : "Campus"
              }
              reputation={stats?.reputation ?? 0}
              credits={stats?.credit_balance ?? student?.credit_balance ?? 0}
              delta={weekDelta}
              personalRank={
                stats ? `#${stats.personal_rank} / ${stats.total_students}` : "—"
              }
              classRank={stats ? `#${stats.class_rank} / ${stats.class_size}` : "—"}
            />

          </section>

          <section className="mt-5 flex items-center gap-4 rounded-3xl border border-border bg-surface/80 p-4">
            <ProgressRing
              value={classScore}
              rank={stats ? ordinal(stats.class_position ?? 0) : "—"}
            />
            <div>
              <p className="text-sm font-semibold leading-snug">
                {stats
                  ? `${ordinal(stats.class_position ?? 0)} place course-wide`
                  : "Ranking your class…"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {stats?.next_class_label
                  ? `${Math.round(Number(stats.points_behind_next_class))} avg pts behind ${stats.next_class_label} · `
                  : stats
                    ? "Leading all classes · "
                    : ""}
                class score {Math.round(classScore)}/100
              </p>
            </div>
          </section>


          <section className="mt-5 grid grid-cols-3 gap-2">
            {actions.map(({ label, icon: Icon, to }) => (
              <button
                key={label}
                onClick={() => to && navigate({ to })}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface/80 px-1.5 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/50 text-primary transition-colors group-hover:bg-accent/60">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-center text-[10px] font-medium leading-tight text-foreground/85">
                  {label}
                </span>
              </button>
            ))}
          </section>

          <section className="mt-7 rounded-3xl border border-border bg-surface/60 p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Live feed
            </h2>
            <ol className="relative mt-4 space-y-5 pl-11">
              <span className="absolute bottom-3 left-[17px] top-3 w-px bg-border" />
              {(ledger ?? []).map((item) => {
                const Icon = sourceIcon[item.source as keyof typeof sourceIcon] ?? Trophy;
                return (
                  <li key={item.id} className="relative">
                    <span className="absolute -left-11 top-0 grid h-9 w-9 place-items-center rounded-full border border-primary/40 bg-accent/40 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold leading-tight">
                          {item.description.split(" · ")[0]}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[item.description.split(" · ").slice(1).join(" · "), timeAgo(item.created_at)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold text-foreground">
                        {item.points > 0 ? "+" : ""}
                        {item.points}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>
    </main>
  );
}
