import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";
import { saveSession, type StudentSession } from "@/lib/session";

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
      setError("Enter both your enrollment number and password");
      return;
    }

    setLoading(true);
    // ---------------------------------------------------------------------
    // PLACEHOLDER AUTHENTICATION
    // Mock login against the `students` table via the `student_login` database
    // function (verifies a demo password hash, never returns password data).
    // TODO: replace with the real university SSO / LDAP integration once the
    // university data partnership is live.
    // ---------------------------------------------------------------------
    const { data, error: rpcError } = await supabase.rpc("student_login", {
      p_enrollment_number: id,
      p_password: password,
    });
    setLoading(false);

    const student = Array.isArray(data) ? data[0] : null;
    if (rpcError || !student) {
      setError("Invalid enrollment number or password");
      return;
    }

    saveSession(student as StudentSession);
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="flex min-h-screen justify-center bg-[oklch(0.278_0.026_258)] py-0 sm:py-8">
      <div className="relative w-full max-w-[390px] overflow-hidden bg-background sm:rounded-[36px] sm:border sm:border-border sm:shadow-[0_40px_120px_-40px_rgba(0,0,0,0.7)]">
        <div className="blob -left-24 -top-20 h-64 w-64 bg-teal/12" />
        <div className="blob -right-24 bottom-0 h-72 w-72 bg-teal-light/10" />

        <div className="relative flex min-h-screen flex-col px-6 pb-12 pt-24 sm:min-h-[720px]">
          <div className="animate-rise text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              CampCredit
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Your campus, your credit.</p>
          </div>

          <form onSubmit={onSubmit} noValidate className="mt-12 space-y-4">
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
                aria-invalid={Boolean(error)}
                className="mt-1.5 w-full rounded-2xl border border-border bg-white/5 px-4 py-3 text-sm text-foreground backdrop-blur-sm placeholder:text-muted-foreground/60 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40"
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
                aria-invalid={Boolean(error)}
                className="mt-1.5 w-full rounded-2xl border border-border bg-white/5 px-4 py-3 text-sm text-foreground backdrop-blur-sm placeholder:text-muted-foreground/60 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40"
                placeholder="••••••••"
              />
              {error ? (
                <p
                  role="alert"
                  className="mt-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
                >
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

            <p className="pt-1 text-center text-xs text-muted-foreground">
              New here?{" "}
              <Link to="/signup" className="font-semibold text-teal-light hover:underline">
                Sign up
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground">
              Forgot password? Contact your university IT helpdesk
            </p>

          </form>
        </div>
      </div>
    </main>
  );
}
