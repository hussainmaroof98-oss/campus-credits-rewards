// -----------------------------------------------------------------------------
// MY VOUCHERS — every voucher this student has been issued.
// Vouchers are issued instantly on redemption ('issued') and flipped to 'used'
// by staff at the counter. There is no approval step any more.
// -----------------------------------------------------------------------------

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Info, TicketCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { loadSession, type StudentSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vouchers")({
  ssr: false,
  component: VouchersPage,
  head: () => ({
    meta: [
      { title: "My Vouchers — CampCredit" },
      {
        name: "description",
        content:
          "Every CampCredit voucher you've been issued, with its code and whether it has been used yet.",
      },
      { property: "og:title", content: "My Vouchers — CampCredit" },
      {
        property: "og:description",
        content: "Show your voucher code at the counter to claim your reward.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Voucher = {
  id: string;
  reward_name: string;
  points_cost: number;
  status: string;
  voucher_code: string | null;
  voucher_note: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function VouchersPage() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentSession | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      navigate({ to: "/login", replace: true });
      return;
    }
    setStudent(session);
  }, [navigate]);

  const { data: vouchers, isLoading } = useQuery({
    queryKey: ["my-vouchers", student?.id],
    enabled: Boolean(student?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_redemptions", {
        p_student_id: student!.id,
      });
      if (error) throw error;
      return (data ?? []) as Voucher[];
    },
  });

  return (
    <main className="flex min-h-screen justify-center bg-black py-0 sm:py-8">
      <div className="relative flex w-full max-w-[390px] flex-col overflow-hidden bg-background sm:rounded-[36px] sm:border sm:border-border sm:shadow-[var(--shadow-frame)]">
        <div className="blob -left-24 -top-20 h-64 w-64 bg-primary/10" />
        <div className="blob -right-28 top-72 h-72 w-72 bg-accent/20" />

        <div className="relative flex-1 px-5 pb-16 pt-6">
          <header className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/redeem" })}
              aria-label="Back to redeem"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface/80 text-muted-foreground transition-all duration-200 hover:-translate-x-0.5 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight">My vouchers</h1>
              <p className="text-xs text-muted-foreground">Show the code at the counter</p>
            </div>
          </header>

          {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading your vouchers…</p>}

          <section className="mt-5 space-y-3">
            {(vouchers ?? []).map((v, i) => {
              const used = v.status === "used";
              return (
                <article
                  key={v.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={cn(
                    "animate-rise rounded-2xl border p-4",
                    used ? "border-border/60 bg-surface/50 opacity-75" : "border-primary/45 bg-surface/80",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-[14px] font-bold leading-tight">
                        {v.reward_name}
                      </h2>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDate(v.created_at)} · {v.points_cost.toLocaleString("en-IN")} pts
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize",
                        used ? "bg-success/20 text-success" : "bg-accent/60 text-primary",
                      )}
                    >
                      {v.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 px-3 py-2.5">
                    <TicketCheck className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 break-all font-mono text-[14px] font-bold tracking-[0.08em] text-foreground sm:text-[15px] sm:tracking-[0.12em]">
                      {v.voucher_code ?? "—"}
                    </span>
                  </div>

                  {v.voucher_note ? (
                    <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      <Info className="mt-0.5 h-3 w-3 shrink-0" />
                      {v.voucher_note}
                    </p>
                  ) : null}
                </article>
              );
            })}

            {!isLoading && (vouchers ?? []).length === 0 && (
              <p className="rounded-2xl border border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">
                No vouchers yet — redeem something to get your first code.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
