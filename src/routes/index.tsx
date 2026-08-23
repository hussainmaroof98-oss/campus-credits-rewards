import { createFileRoute } from "@tanstack/react-router";
import { Gift, CalendarDays, Trophy, Droplets, GraduationCap } from "lucide-react";

import avatar from "@/assets/avatar-aarav.jpg";
import { CampusIdCard } from "@/components/CampusIdCard";
import { ProgressRing } from "@/components/ProgressRing";

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
  { label: "Redeem", icon: Gift },
  { label: "Events", icon: CalendarDays },
  { label: "Leaderboard", icon: Trophy },
];

const feed = [
  {
    icon: Trophy,
    tone: "text-gold",
    ring: "bg-gold/15 border-gold/40",
    title: "Hackathon — 2nd place",
    meta: "CodeStorm 24h · 2 days ago",
    points: "+200",
  },
  {
    icon: Droplets,
    tone: "text-magenta",
    ring: "bg-magenta/15 border-magenta/40",
    title: "Blood donation drive",
    meta: "NSS volunteering · 5 days ago",
    points: "+40",
  },
  {
    icon: GraduationCap,
    tone: "text-cyan",
    ring: "bg-cyan/15 border-cyan/40",
    title: "Semester result synced",
    meta: "SGPA 9.1 · Sem 3 · 1 week ago",
    points: "+500",
  },
];

function Home() {
  return (
    <main className="flex min-h-screen justify-center bg-[oklch(0.11_0.012_275)] py-0 sm:py-8">
      <div className="relative w-full max-w-[390px] overflow-hidden bg-background sm:rounded-[36px] sm:border sm:border-border sm:shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
        <div className="blob -left-24 -top-16 h-64 w-64 bg-violet/30" />
        <div className="blob -right-24 top-64 h-72 w-72 bg-cyan/20" />

        <div className="relative px-5 pb-14 pt-6">
          <header className="flex items-center justify-between">
            <span className="font-display text-xl font-bold tracking-tight">CampCredit</span>
            <img
              src={avatar}
              alt="Aarav Mehta profile"
              width={512}
              height={512}
              className="h-10 w-10 rounded-full border border-border object-cover"
            />
          </header>

          <section className="mt-6 animate-rise">
            <h1 className="font-display text-2xl font-bold">Hi, Aarav</h1>
            <p className="mt-1 text-sm text-muted-foreground">BTech CSE · Section A · Year 2</p>
          </section>

          <section className="mt-5">
            <CampusIdCard />
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
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface/80 px-2 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet/50 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-violet/15 text-violet transition-colors group-hover:bg-violet/25">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-medium text-foreground/85">{label}</span>
              </button>
            ))}
          </section>

          <section className="mt-7">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Live feed
            </h2>
            <ol className="relative mt-4 space-y-5 pl-9">
              <span className="absolute bottom-3 left-[17px] top-3 w-px bg-border" />
              {feed.map((item) => (
                <li key={item.title} className="relative">
                  <span
                    className={`absolute -left-9 top-0 grid h-9 w-9 place-items-center rounded-full border ${item.ring} ${item.tone}`}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold leading-tight">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                    </div>
                    <span className="font-mono text-sm font-bold text-gold">{item.points}</span>
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
