import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Crown, GraduationCap, LockKeyhole, Sparkles, Trophy, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { loadSession, type StudentSession } from "@/lib/session";

type Achievement = { id: string; points: number; citation: string; source: string; is_private: boolean; created_at: string };
const groups = [
  { source: "academic", label: "Academic distinction", Icon: GraduationCap },
  { source: "event", label: "Events and competitions", Icon: Trophy },
  { source: "team_bonus", label: "Team contribution", Icon: Users },
] as const;

export const Route = createFileRoute("/portfolio")({
  ssr: false,
  component: PortfolioPage,
  head: () => ({ meta: [
    { title: "Achievement Portfolio — CampCredit" },
    { name: "description", content: "A polished portfolio of your public academic, event, and team achievements." },
    { property: "og:title", content: "Achievement Portfolio — CampCredit" },
    { property: "og:description", content: "Share-worthy highlights from your CampCredit achievement record." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
});

function PortfolioPage() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentSession | null>(null);
  useEffect(() => { const session = loadSession(); if (!session) navigate({ to: "/login", replace: true }); else setStudent(session); }, [navigate]);
  const { data: plus } = useQuery({ queryKey: ["plus-profile", student?.id], enabled: Boolean(student?.id), queryFn: async () => { if (!student) throw new Error("Student session missing"); const { data, error } = await supabase.rpc("student_plus_profile", { p_student_id: student.id }); if (error) throw error; return data?.[0] ?? null; } });
  const { data: achievements, isLoading } = useQuery({ queryKey: ["portfolio", student?.id], enabled: Boolean(student?.id && plus?.is_campus_plus), queryFn: async () => { if (!student) throw new Error("Student session missing"); const { data, error } = await supabase.rpc("my_achievements", { p_student_id: student.id }); if (error) throw error; return (data ?? []).filter((item) => !item.is_private && item.source !== "penalty") as Achievement[]; } });
  const total = useMemo(() => (achievements ?? []).reduce((sum, item) => sum + item.points, 0), [achievements]);

  return <main className="app-stage"><div className="app-shell min-h-screen"><div className="relative px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
    <header className="flex items-center gap-3"><Button variant="outline" size="icon" onClick={() => navigate({ to: "/profile" })} className="rounded-full bg-surface/80"><ArrowLeft className="h-4 w-4" /></Button><div><h1 className="font-display text-xl font-bold">Achievement Portfolio</h1><p className="text-xs text-muted-foreground">Public proof of the work behind your reputation</p></div></header>
    {plus && !plus.is_campus_plus ? <section className="mt-8 rounded-3xl border border-primary/35 bg-surface/75 p-6 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent/55 text-primary"><LockKeyhole className="h-5 w-5" /></span><h2 className="mt-4 font-display text-xl font-bold">Build your showcase with Campus Plus</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Turn your public academic, event, and team achievements into a polished portfolio.</p><Button onClick={() => navigate({ to: "/campus-plus" })} className="mt-5 rounded-full"><Crown className="mr-2 h-4 w-4" />Explore Campus Plus</Button></section> : <>
      <section className="card-hero mt-6 rounded-3xl p-5 shadow-[var(--shadow-card)]"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/70">CampCredit verified portfolio</p><h2 className="mt-2 font-display text-2xl font-bold">{student?.name ?? "Student"}</h2><p className="mt-1 text-sm text-foreground/75">{student ? `${student.branch} · Section ${student.section} · Year ${student.year}` : ""}</p><div className="mt-6 flex items-end justify-between gap-4"><div><p className="font-mono text-3xl font-bold">{total.toLocaleString("en-IN")}</p><p className="text-xs text-foreground/70">public reputation earned</p></div><Sparkles className="h-6 w-6 text-foreground/75" /></div></section>
      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">Preparing your portfolio…</p> : groups.map(({ source, label, Icon }) => { const items = (achievements ?? []).filter((item) => item.source === source); if (!items.length) return null; return <section key={source} className="mt-5"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><h2 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</h2></div><div className="mt-3 space-y-2">{items.map((item) => <article key={item.id} className="rounded-2xl border border-border bg-surface/70 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-sm font-semibold leading-snug">{item.citation}</h3><p className="mt-1 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p></div><span className="shrink-0 font-mono text-sm font-bold text-foreground">+{item.points}</span></div></article>)}</div></section>; })}
      {!isLoading && (achievements ?? []).length === 0 && <p className="mt-6 rounded-2xl border border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">Your public achievements will appear here as you earn them.</p>}
    </>}
  </div></div></main>;
}