// -----------------------------------------------------------------------------
// REDEEM — instant vouchers, no approval queue.
// Spending uses CREDITS only (point_ledger). Reputation/standing is untouched.
// Stock is held PER CLASS: another section selling out never blocks you.
// A top-ranked class may also carry an active store discount, applied at
// checkout by redeem_reward() — the prices below mirror that same maths.
// -----------------------------------------------------------------------------

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Check,
  Coffee,
  FlaskConical,
  Gift,
  Pencil,
  Shirt,
  Sparkles,
  Ticket,
  TicketCheck,
  Utensils,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { loadSession, type StudentSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/redeem")({
  ssr: false,
  component: RedeemPage,
  head: () => ({
    meta: [
      { title: "Redeem Credits — CampCredit" },
      {
        name: "description",
        content:
          "Spend your CampCredit balance on canteen vouchers, campus merch, fee waivers and priority campus perks.",
      },
      { property: "og:title", content: "Redeem Credits — CampCredit" },
      {
        property: "og:description",
        content: "Turn your campus credits into instant vouchers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Reward = {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  icon: string;
  uses_label: string;
};

const iconMap: Record<string, typeof Gift> = {
  utensils: Utensils,
  shirt: Shirt,
  "book-open": BookOpen,
  "flask-conical": FlaskConical,
  ticket: Ticket,
  pencil: Pencil,
  coffee: Coffee,
  briefcase: Briefcase,
  gift: Gift,
};

function RedeemPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);

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
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const { data: stats } = useQuery({
    queryKey: ["student-stats", student?.id],
    enabled: Boolean(student?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_stats", {
        p_student_id: student!.id,
      });
      if (error) throw error;
      return (data?.[0] ?? null) as { credit_balance: number } | null;
    },
  });

  const balance = stats?.credit_balance ?? 0;

  // The student's own class — needed for per-class stock and class discounts.
  const { data: myClass } = useQuery({
    queryKey: ["my-class", student?.id],
    enabled: Boolean(student),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id,branch,section")
        .eq("branch", student!.branch)
        .eq("section", student!.section)
        .eq("year", student!.year)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: discount } = useQuery({
    queryKey: ["store-discount", student?.id],
    enabled: Boolean(student?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_store_discount", {
        p_student_id: student!.id,
      });
      if (error) throw error;
      return (data?.[0] ?? null) as {
        class_discount_percent: number;
        plus_discount_percent: number;
        total_discount_percent: number;
        expires_at: string | null;
        class_rank: number | null;
        class_label: string | null;
      } | null;
    },
  });

  const percent = discount?.total_discount_percent ?? 0;
  const daysLeft = discount?.expires_at
    ? Math.max(
        0,
        Math.ceil((new Date(discount.expires_at).getTime() - Date.now()) / 86_400_000),
      )
    : 0;
  const priceFor = (cost: number) => Math.max(0, Math.ceil((cost * (100 - percent)) / 100));

  const { data: rewards, isLoading } = useQuery({
    queryKey: ["rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("id,name,description,points_cost,icon,uses_label")
        .eq("active", true)
        .order("points_cost", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reward[];
    },
  });

  const { data: stock } = useQuery({
    queryKey: ["reward-stock", myClass?.id],
    enabled: Boolean(myClass?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reward_stock")
        .select("reward_id,remaining_stock")
        .eq("class_id", myClass!.id);
      if (error) throw error;
      const map: Record<string, number | null> = {};
      for (const row of data ?? []) map[row.reward_id] = row.remaining_stock;
      return map;
    },
  });

  const redeem = useMutation({
    mutationFn: async (reward: Reward) => {
      const { data, error } = await supabase.rpc("redeem_reward", {
        p_student_id: student!.id,
        p_reward_id: reward.id,
      });
      if (error) throw error;
      return (data?.[0] ?? null) as { ok: boolean; message: string } | null;
    },
    onSuccess: (result) => {
      setToast({ ok: Boolean(result?.ok), message: result?.message ?? "Something went wrong" });
      if (result?.ok) {
        queryClient.invalidateQueries({ queryKey: ["student-stats", student?.id] });
        queryClient.invalidateQueries({ queryKey: ["my-vouchers", student?.id] });
        queryClient.invalidateQueries({ queryKey: ["reward-stock", myClass?.id] });
        queryClient.invalidateQueries({ queryKey: ["ledger", student?.id] });
      }
    },
    onError: () => setToast({ ok: false, message: "Could not redeem right now. Try again." }),
  });

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
              <h1 className="font-display text-xl font-bold tracking-tight">Redeem</h1>
              <p className="text-xs text-muted-foreground">Credits in, voucher out — instantly</p>
            </div>
            <button
              onClick={() => navigate({ to: "/vouchers" })}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground"
            >
              <TicketCheck className="h-3.5 w-3.5" /> Vouchers
            </button>
          </header>

          <section className="animate-rise mt-5 rounded-3xl border border-border bg-surface/70 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Available balance
            </p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-tight text-foreground">
              {balance.toLocaleString("en-IN")}
              <span className="ml-2 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                credits
              </span>
            </p>
          </section>

          {percent > 0 && (
            <section className="animate-rise mt-3 flex items-start gap-2.5 rounded-2xl border border-primary/45 bg-accent/40 p-3.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/25 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="text-[12px] leading-relaxed text-foreground">
                 <span className="font-bold">{percent}% off</span> all rewards
                 {(discount?.class_discount_percent ?? 0) > 0 ? ` · ${discount?.class_discount_percent}% class reward${daysLeft ? ` for ${daysLeft} more day${daysLeft === 1 ? "" : "s"}` : ""}` : ""}
                 {(discount?.plus_discount_percent ?? 0) > 0 ? ` · ${discount?.plus_discount_percent}% Campus Plus` : ""}.
              </p>
            </section>
          )}

          <h2 className="mt-7 font-display text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Reward catalog
          </h2>

          {isLoading ? (
            <div className="mt-3 grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-2xl border border-border bg-surface/50"
                />
              ))}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2">
              {(rewards ?? []).map((reward, i) => {
                const Icon = iconMap[reward.icon] ?? Gift;
                const price = priceFor(reward.points_cost);
                const remaining = stock?.[reward.id];
                const soldOut = remaining !== undefined && remaining !== null && remaining <= 0;
                const affordable = balance >= price;
                const canBuy = affordable && !soldOut;
                const pendingThis = redeem.isPending && redeem.variables?.id === reward.id;
                return (
                  <article
                    key={reward.id}
                    className={cn(
                      "animate-rise flex flex-col rounded-2xl border bg-surface/70 p-3.5 transition-all duration-200",
                      canBuy
                        ? "border-border hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[var(--shadow-lift)]"
                        : "border-border/60 opacity-70",
                    )}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-full",
                        canBuy ? "bg-accent/50 text-primary" : "bg-secondary/50 text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="mt-2.5 font-display text-[13px] font-bold leading-tight">
                      {reward.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                      {reward.description}
                    </p>
                    {/* What one redemption actually covers */}
                    <p className="mt-1.5 inline-flex w-fit rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {reward.uses_label}
                    </p>
                    <p className="mt-2 font-mono text-sm font-bold text-foreground">
                      {price.toLocaleString("en-IN")}
                      {percent > 0 && (
                        <span className="ml-1.5 font-mono text-[11px] font-medium text-muted-foreground line-through">
                          {reward.points_cost.toLocaleString("en-IN")}
                        </span>
                      )}
                      <span className="ml-1 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        pts
                      </span>
                    </p>
                    {remaining !== undefined && remaining !== null && !soldOut && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {remaining} left for your class
                      </p>
                    )}
                    <div className="mt-auto pt-2.5">
                      {canBuy ? (
                        <button
                          disabled={redeem.isPending}
                          onClick={() => redeem.mutate(reward)}
                          className="btn-hero w-full rounded-full py-2 font-display text-[12px] font-bold text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70"
                        >
                          {pendingThis ? "Redeeming…" : "Redeem"}
                        </button>
                      ) : (
                        <>
                          <button
                            disabled
                            className="w-full cursor-not-allowed rounded-full border border-border bg-secondary/50 py-2 font-display text-[12px] font-bold text-muted-foreground"
                          >
                            Redeem
                          </button>
                          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                            {soldOut
                              ? "Sold out for your class"
                              : `Not enough credits · ${(price - balance).toLocaleString("en-IN")} short`}
                          </p>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <button
            onClick={() => navigate({ to: "/vouchers" })}
            className="mt-7 flex w-full items-center justify-between rounded-2xl border border-border bg-surface/70 px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45"
          >
            <span>
              <span className="block font-display text-[13px] font-bold">My vouchers</span>
              <span className="block text-[11px] text-muted-foreground">
                Your codes and what you&apos;ve already used
              </span>
            </span>
            <TicketCheck className="h-4 w-4 text-primary" />
          </button>
        </div>

        {toast && (
          <div
            role="status"
            className={cn(
              "animate-rise pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2.5 text-[12px] font-medium backdrop-blur-md",
              toast.ok
                ? "border-success/40 bg-success/15 text-success"
                : "border-destructive/40 bg-destructive/15 text-destructive",
            )}
          >
            {toast.ok && <Check className="h-3.5 w-3.5" />}
            {toast.message}
          </div>
        )}
      </div>
    </main>
  );
}
