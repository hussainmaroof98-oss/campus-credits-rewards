import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Log in — CampCredit" },
      {
        name: "description",
        content:
          "Sign in to CampCredit with your university enrollment number to track campus credits and rewards.",
      },
      { property: "og:title", content: "Log in — CampCredit" },
      {
        property: "og:description",
        content: "Sign in with your enrollment number to see your campus credits.",
      },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const id = enrollment.trim();
    if (!id || !password) {
      setError("Invalid enrollment number or password");
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: `${id.toLowerCase()}@campcredit.local`,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("Invalid enrollment number or password");
      return;
    }
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="flex min-h-screen justify-center bg-[oklch(0.31_0.035_249.5)] py-0 sm:py-8">
      <div className="relative w-full max-w-[390px] overflow-hidden bg-background sm:rounded-[36px] sm:border sm:border-border sm:shadow-[0_40px_120px_-40px_rgba(0,0,0,0.7)]">
        <div className="blob -left-24 -top-20 h-64 w-64 bg-teal/25" />
        <div className="blob -right-24 bottom-0 h-72 w-72 bg-teal-light/15" />

        <div className="relative flex min-h-screen flex-col px-6 pb-12 pt-24 sm:min-h-[720px]">
          <div className="animate-rise text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              CampCredit
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Your campus, your credit.</p>
          </div>

          <form onSubmit={onSubmit} className="mt-12 space-y-4">
            <div>
              <label
                htmlFor="enrollment"
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
              >
                Enrollment Number
              </label>
              <input
                id="enrollment"
                value={enrollment}
                onChange={(e) => setEnrollment(e.target.value)}
                autoComplete="username"
                className="mt-1.5 w-full rounded-2xl border border-border bg-surface/70 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/50"
                placeholder="2023CSE042"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1.5 w-full rounded-2xl border border-border bg-surface/70 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/50"
                placeholder="••••••••"
              />
              {error ? (
                <p className="mt-2 text-xs font-medium text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
              Use your university enrollment number and password
            </p>

            <button
              type="submit"
              disabled={loading}
              className="btn-hero mt-2 w-full rounded-2xl py-3.5 font-display text-sm font-bold text-[oklch(0.28_0.03_250)] transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70"
            >
              {loading ? "Logging in…" : "Log In"}
            </button>

            <div className="pt-1 text-center">
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
