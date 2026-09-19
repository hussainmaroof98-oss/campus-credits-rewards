import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Check, Crown, Palette, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CardSkin } from "@/components/CampusIdCard";
import { supabase } from "@/integrations/supabase/client";
import { loadSession, type StudentSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/campus-plus")({
  ssr: false,
  component: CampusPlusPage,
  head: () => ({
    meta: [
      { title: "Campus Plus — CampCredit membership" },
      {
        name: "description",
        content:
          "Get 2x earned credits, a 5% personal store discount, an achievement portfolio, and Digital Campus ID skins.",
      },
      { property: "og:title", content: "Campus Plus — CampCredit membership" },
      {
        property: "og:description",
        content: "Four real CampCredit benefits: 2x earned credits, store savings, a portfolio, and card skins.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const freePerks = [
  { label: "Standard earned credits", ok: true },
  { label: "Class store discount only", ok: true },
  { label: "Achievement ledger", ok: true },
  { label: "Default navy ID card", ok: true },
];

const plusPerks = [
  { label: "2x credits on academic and staff awards", ok: true },
  { label: "Personal 5% store discount, added to class savings", ok: true },
  { label: "Share-worthy achievement portfolio", ok: true },
  { label: "Three Digital Campus ID card skins", ok: true },
];

const skins: Array<{ id: CardSkin; label: string; className: string }> = [
  { id: "navy", label: "Campus Navy", className: "card-hero" },
  { id: "aurora", label: "Aurora", className: "card-hero-aurora" },
  { id: "ember", label: "Ember", className: "card-hero-ember" },
];

function CampusPlusPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      navigate({ to: "/login", replace: true });
      return;
    }
    setStudent(session);
  }, [navigate]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const { data: plusProfile } = useQuery({
    queryKey: ["plus-profile", student?.id],
    enabled: Boolean(student?.id),
    queryFn: async () => {
      if (!student) throw new Error("Student session missing");
      const { data, error } = await supabase.rpc("student_plus_profile", {
        p_student_id: student.id,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  // -------------------------------------------------------------------------
  // PLACEHOLDER SUBSCRIPTION FLOW
  // No real payment can run inside the web preview, so "Subscribe" simply flips
  // is_campus_plus to true for the signed-in student — nothing is charged.
  // TODO: replace this mutation with the RevenueCat purchase flow (offerings →
  // purchasePackage → entitlement check) once the app is wrapped with Capacitor.
  // -------------------------------------------------------------------------
  const subscribe = useMutation({
    mutationFn: async () => {
      if (!student) throw new Error("Student session missing");
      const { data, error } = await supabase.rpc("student_subscribe_campus_plus", {
        p_student_id: student.id,
      });
      if (error) throw error;
      return Boolean(data?.[0]?.ok);
    },
    onSuccess: (ok) => {
      if (ok) {
        setToast("Welcome to Campus Plus ✨");
        queryClient.invalidateQueries({ queryKey: ["plus-profile", student?.id] });
      } else {
        setToast("Could not activate Campus Plus. Try again.");
      }
    },
    onError: () => setToast("Could not activate Campus Plus. Try again."),
  });

  const chooseSkin = useMutation({
    mutationFn: async (skin: CardSkin) => {
      if (!student) throw new Error("Student session missing");
      const { error } = await supabase.rpc("student_set_card_skin", {
        p_student_id: student.id,
        p_card_skin: skin,
      });
      if (error) throw error;
      return skin;
    },
    onSuccess: (skin) => {
      setToast(`${skins.find((item) => item.id === skin)?.label ?? "Card"} selected`);
      queryClient.invalidateQueries({ queryKey: ["plus-profile", student?.id] });
    },
    onError: () => setToast("Could not change your card skin."),
  });

  const isPlus = Boolean(plusProfile?.is_campus_plus);

  return (
    <main className="flex min-h-screen justify-center bg-black py-0 sm:py-8">
      <div className="relative flex w-full max-w-[390px] flex-col overflow-hidden bg-background sm:rounded-[36px] sm:border sm:border-border sm:shadow-[var(--shadow-frame)]">
        <div className="blob -left-24 -top-20 h-64 w-64 bg-primary/10" />
        <div className="blob -right-28 top-72 h-72 w-72 bg-primary/10" />

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
              <h1 className="flex items-center gap-1.5 font-display text-xl font-bold tracking-tight">
                Campus Plus
                <Crown className="h-4 w-4 text-primary" />
              </h1>
              <p className="text-xs text-muted-foreground">More credits, savings, and a portfolio</p>
            </div>
          </header>

          <section className="animate-rise mt-5 rounded-3xl border border-border bg-surface/70 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Membership
            </p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-tight text-foreground">
              ₹49
              <span className="ml-2 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                / month
              </span>
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Cancel anytime. Billed monthly once payments go live.
            </p>
          </section>

          <h2 className="mt-7 font-display text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Compare plans
          </h2>

          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <article className="animate-rise rounded-2xl border border-border bg-surface/70 p-4">
              <h3 className="font-display text-[13px] font-bold">Free</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Your current plan basics</p>
              <ul className="mt-3 space-y-2">
                {freePerks.map((p) => (
                  <li key={p.label} className="flex items-start gap-2 text-[12px] leading-snug">
                    <span
                      className={cn(
                        "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full",
                        p.ok ? "bg-accent/50 text-primary" : "bg-secondary/50 text-muted-foreground",
                      )}
                    >
                      {p.ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                    </span>
                    <span className={p.ok ? "text-foreground/85" : "text-muted-foreground"}>
                      {p.label}
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article
              className="animate-rise rounded-2xl border border-primary/40 bg-surface/80 p-4 shadow-[var(--shadow-lift)]"
              style={{ animationDelay: "60ms" }}
            >
              <h3 className="flex items-center gap-1.5 font-display text-[13px] font-bold text-foreground">
                Campus Plus
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Everything in Free, plus</p>
              <ul className="mt-3 space-y-2">
                {plusPerks.map((p) => (
                  <li key={p.label} className="flex items-start gap-2 text-[12px] leading-snug">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/25 text-primary">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    <span className="text-foreground/90">{p.label}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <section className="mt-7">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="flex items-center gap-2 font-display text-sm font-bold"><Palette className="h-4 w-4 text-primary" />Digital ID skins</h2><p className="mt-1 text-[11px] text-muted-foreground">Your selected look appears on Home.</p></div>
              {!isPlus && <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[10px] text-muted-foreground">Plus only</span>}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {skins.map((skin) => {
                const selected = (plusProfile?.card_skin ?? "navy") === skin.id;
                return <Button key={skin.id} variant="ghost" disabled={!isPlus || chooseSkin.isPending} onClick={() => chooseSkin.mutate(skin.id)} aria-label={`Use ${skin.label} card skin`} className={cn("h-auto min-w-0 flex-col rounded-2xl border p-1.5 text-left transition-all", selected ? "border-primary" : "border-border", !isPlus && skin.id !== "navy" && "opacity-45")}><span className={cn("block aspect-[1.55] w-full rounded-xl", skin.className)} /><span className="mt-1.5 block max-w-full truncate text-center text-[10px] font-medium">{skin.label}</span></Button>;
              })}
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-surface/70 p-4">
            <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent/55 text-primary"><BriefcaseBusiness className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h2 className="font-display text-sm font-bold">Achievement Portfolio</h2><p className="text-[11px] text-muted-foreground">A polished record of your public achievements.</p></div></div>
            <Button variant="outline" onClick={() => navigate({ to: "/portfolio" })} className="mt-3 w-full rounded-full">{isPlus ? "Open my portfolio" : "Preview locked portfolio"}</Button>
          </section>

          <section className="mt-7">
            {isPlus ? (
              <div className="animate-rise rounded-3xl border border-success/35 bg-success/10 p-4 text-center">
                <p className="font-display text-sm font-bold text-success">
                  You're a Campus Plus member ✨
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                   Your multiplier, store discount, portfolio, and card skins are active.
                </p>
                {/* PLACEHOLDER: real subscription management will open the
                    RevenueCat / store-managed subscription screen natively. */}
                <button
                  onClick={() => setToast("Subscription management arrives with the native app.")}
                  className="mt-3 font-display text-[12px] font-semibold text-primary underline underline-offset-4 transition-opacity hover:opacity-80"
                >
                  Manage subscription
                </button>
              </div>
            ) : (
              <>
                <button
                  disabled={subscribe.isPending || !student}
                  onClick={() => subscribe.mutate()}
                  className="btn-hero w-full rounded-full py-3 font-display text-[13px] font-bold text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70"
                >
                  {subscribe.isPending ? "Activating…" : "Subscribe · ₹49/month"}
                </button>
                <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
                  Demo mode — no payment is taken. Real billing arrives with the native app.
                </p>
              </>
            )}
          </section>
        </div>

        {toast && (
          <div
            role="status"
            className="animate-rise pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-success/40 bg-success/15 px-4 py-2.5 text-[12px] font-medium text-success backdrop-blur-md"
          >
            {toast}
          </div>
        )}
      </div>
    </main>
  );
}
