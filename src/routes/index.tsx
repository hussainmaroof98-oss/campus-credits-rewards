import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gift, CalendarDays, Trophy, Droplets, GraduationCap, LogOut } from "lucide-react";

import avatar from "@/assets/avatar-aarav.jpg";
import { CampusIdCard } from "@/components/CampusIdCard";
import { ProgressRing } from "@/components/ProgressRing";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
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
  { label: "Redeem", icon: Gift },
  { label: "Events", icon: CalendarDays },
  { label: "Leaderboard", icon: Trophy },
];

const feed = [
  {
    icon: Trophy,
    title: "Hackathon — 2nd place",
    meta: "CodeStorm 24h · 2 days ago",
    points: "+200",
  },
  {
    icon: Droplets,
    title: "Blood donation drive",
    meta: "NSS volunteering · 5 days ago",
    points: "+40",
  },
  {
    icon: GraduationCap,
    title: "Semester result synced",
    meta: "SGPA 9.1 · Sem 3 · 1 week ago",
    points: "+500",
  },
];

function Home() {
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const firstName = (profile?.full_name || "").split(" ")[0] || "there";

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <main className="flex min-h-screen justify-center bg-[oklch(0.31_0.035_249.5)] py-0 sm:py-8">
      <div className="relative w-full max-w-[390px] overflow-hidden bg-background sm:rounded-[36px] sm:border sm:border-border sm:shadow-[0_40px_120px_-40px_rgba(0,0,0,0.7)]">
        <div className="blob -left-24 -top-16 h-64 w-64 bg-teal/25" />
        <div className="blob -right-24 top-64 h-72 w-72 bg-teal-light/15" />

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
                alt={`${profile?.full_name ?? "Student"} profile`}
                width={512}
                height={512}
                className="h-10 w-10 rounded-full border border-border object-cover"
              />
            </div>
          </header>

          <section className="mt-6 animate-rise">
            <h1 className="font-display text-2xl font-bold">Hi, {firstName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile
                ? `${profile.branch} · Section ${profile.section} · Year ${profile.year}`
                : "Loading your campus profile…"}
            </p>
          </section>

          <section className="mt-5">
            <CampusIdCard
              name={profile?.full_name || "—"}
              subtitle={
                profile ? `${profile.branch.split(" ").pop()}-${profile.section}` : "Campus"
              }
              balance={profile?.credit_balance ?? 0}
              personalRank={profile?.personal_rank || "—"}
              classRank={profile?.class_rank || "—"}
            />
          </section>

          <section className="mt-5 flex items-center gap-4 rounded-3xl border border-border bg-surface/80 p-4">
            <ProgressRing value={72} rank="3rd" />
            <div>
              <p className="text-sm font-semibold leading-snug">3rd place course-wide</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                40 pts behind CSE-B · class score 72/100
              </p>
            </div>
          </section>

          <section className="mt-5 grid grid-cols-3 gap-2.5">
            {actions.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface/80 px-2 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal/50 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-teal/20 text-teal-light transition-colors group-hover:bg-teal/30">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-medium text-foreground/85">{label}</span>
              </button>
            ))}
          </section>

          <section className="mt-7 rounded-3xl border border-border bg-surface/60 p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Live feed
            </h2>
            <ol className="relative mt-4 space-y-5 pl-11">
              <span className="absolute bottom-3 left-[17px] top-3 w-px bg-border" />
              {feed.map((item) => (
                <li key={item.title} className="relative">
                  <span className="absolute -left-11 top-0 grid h-9 w-9 place-items-center rounded-full border border-teal/40 bg-teal/15 text-teal-light">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold leading-tight">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                    </div>
                    <span className="font-mono text-sm font-bold text-cream">{item.points}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </main>
  );
}
