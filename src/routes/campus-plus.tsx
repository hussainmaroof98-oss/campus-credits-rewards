import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Crown, Sparkles, X } from "lucide-react";

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
          "Upgrade to Campus Plus for 2x credit cashback, priority event registration, an ad-free app and the AI study planner.",
      },
      { property: "og:title", content: "Campus Plus — CampCredit membership" },
      {
        property: "og:description",
        content: "2x cashback, priority events, ad-free and an AI study planner for ₹49/month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const freePerks = [
  { label: "Standard cashback rate", ok: true },
  { label: "Standard event access", ok: true },
  { label: "Ads shown in app", ok: false },
  { label: "AI study planner", ok: false },
];

const plusPerks = [
  { label: "2x cashback rate", ok: true },
  { label: "Priority event registration", ok: true },
  { label: "Ad-free experience", ok: true },
  { label: "AI study planner", ok: true },
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

  // -------------------------------------------------------------------------
  // PLACEHOLDER SUBSCRIPTION FLOW
  // No real payment can run inside the web preview, so "Subscribe" simply flips
  // is_campus_plus to true for the signed-in student — nothing is charged.
  // TODO: replace this mutation with the RevenueCat purchase flow (offerings →
  // purchasePackage → entitlement check) once the app is wrapped with Capacitor.
  // -------------------------------------------------------------------------
  const subscribe = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("student_subscribe_campus_plus", {
        p_student_id: student!.id,
      });
      if (error) throw error;
      return Boolean(data?.[0]?.ok);
    },
    onSuccess: (ok) => {
      if (ok) {
        setToast("Welcome to Campus Plus ✨");
        queryClient.invalidateQueries({ queryKey: ["campus-plus", student?.id] });
      } else {
        setToast("Could not activate Campus Plus. Try again.");
      }
    },
    onError: () => setToast("Could not activate Campus Plus. Try again."),
  });

  return (
    <main className="flex min-h-screen justify-center bg-[oklch(0.278_0.026_258)] py-0 sm:py-8">
      <div className="relative flex w-full max-w-[390px] flex-col overflow-hidden bg-background sm:rounded-[36px] sm:border sm:border-border sm:shadow-[0_40px_120px_-40px_rgba(0,0,0,0.7)]">
        <div className="blob -left-24 -top-20 h-64 w-64 bg-sand/10" />
        <div className="blob -right-28 top-72 h-72 w-72 bg-teal/12" />

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
                <Crown className="h-4 w-4 text-sand" />
              </h1>
              <p className="text-xs text-muted-foreground">Earn faster, skip the queue</p>
            </div>
          </header>

          <section className="animate-rise mt-5 rounded-3xl border border-border bg-surface/70 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Membership
            </p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-tight text-cream">
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
                        p.ok ? "bg-teal-deep/25 text-teal-light" : "bg-white/5 text-muted-foreground",
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
              className="animate-rise rounded-2xl border border-sand/40 bg-surface/80 p-4 shadow-[var(--shadow-lift)]"
              style={{ animationDelay: "60ms" }}
            >
              <h3 className="flex items-center gap-1.5 font-display text-[13px] font-bold text-cream">
                Campus Plus
                <Sparkles className="h-3.5 w-3.5 text-sand" />
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Everything in Free, plus</p>
              <ul className="mt-3 space-y-2">
                {plusPerks.map((p) => (
                  <li key={p.label} className="flex items-start gap-2 text-[12px] leading-snug">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-sand/25 text-sand">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    <span className="text-foreground/90">{p.label}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <section className="mt-7">
            {isPlus ? (
              <div className="animate-rise rounded-3xl border border-success/35 bg-success/10 p-4 text-center">
                <p className="font-display text-sm font-bold text-success">
                  You're a Campus Plus member ✨
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  2x cashback and priority registration are active on your account.
                </p>
                {/* PLACEHOLDER: real subscription management will open the
                    RevenueCat / store-managed subscription screen natively. */}
                <button
                  onClick={() => setToast("Subscription management arrives with the native app.")}
                  className="mt-3 font-display text-[12px] font-semibold text-teal-light underline underline-offset-4 transition-opacity hover:opacity-80"
                >
                  Manage subscription
                </button>
              </div>
            ) : (
              <>
                <button
                  disabled={subscribe.isPending || !student}
                  onClick={() => subscribe.mutate()}
                  className="btn-hero w-full rounded-full py-3 font-display text-[13px] font-bold text-[oklch(0.28_0.03_250)] transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70"
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
