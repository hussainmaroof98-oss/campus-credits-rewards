import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";
import { saveSession, type StudentSession } from "@/lib/session";

export const Route = createFileRoute("/signup")({
  ssr: false,
  component: SignUpPage,
  head: () => ({
    meta: [
      { title: "Create your account — CampCredit" },
      {
        name: "description",
        content:
          "Create a CampCredit account with your enrollment number to start earning campus credits, climbing class leaderboards and redeeming rewards.",
      },
      { property: "og:title", content: "Create your account — CampCredit" },
      {
        property: "og:description",
        content: "Sign up with your enrollment number and start earning campus credits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const BRANCHES = [
  "BTech CSE",
  "BTech CSE AI/ML",
  "BTech ECE",
  "BTech ME",
  "BCA",
  "BBA",
] as const;
const SECTIONS = ["A", "B", "C"] as const;
const YEARS = [1, 2, 3, 4] as const;

const fieldClass =
  "mt-1.5 w-full rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground backdrop-blur-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";
const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

function SignUpPage() {
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState("");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState<string>(BRANCHES[0]);
  const [section, setSection] = useState<string>(SECTIONS[0]);
  const [year, setYear] = useState<number>(1);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const id = enrollment.trim();
    const fullName = name.trim();

    if (!id || !fullName || !password || !confirm) {
      setError("Please fill in every field");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    // -------------------------------------------------------------------------
    // PLACEHOLDER OPEN SELF-REGISTRATION
    // This signup flow is a temporary stand-in so real students can test the app
    // before the university SSO / LDAP partnership is live. Once that is
    // connected, self-registration goes away entirely — student identity, branch,
    // section and year will come straight from the university directory.
    // -------------------------------------------------------------------------
    const { data, error: rpcError } = await supabase.rpc("student_register", {
      p_enrollment_number: id,
      p_name: fullName,
      p_section: section,
      p_branch: branch,
      p_year: year,
      p_password: password,
    });
    setLoading(false);

    const student = Array.isArray(data) ? data[0] : null;
    if (rpcError || !student) {
      setError(rpcError?.message ?? "Could not create your account. Please try again.");
      return;
    }

    saveSession(student as StudentSession);
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="flex min-h-screen justify-center bg-black py-0 sm:py-8">
      <div className="relative w-full max-w-[390px] overflow-hidden bg-background sm:rounded-[36px] sm:border sm:border-border sm:shadow-[var(--shadow-frame)]">
        <div className="blob -left-24 -top-20 h-64 w-64 bg-primary/10" />
        <div className="blob -right-24 bottom-0 h-72 w-72 bg-accent/20" />

        <div className="relative flex min-h-screen flex-col px-6 pb-12 pt-16 sm:min-h-[720px]">
          <div className="animate-rise text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              CampCredit
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Create your campus account.</p>
          </div>

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
            <div>
              <label htmlFor="enrollment" className={labelClass}>
                Enrollment Number
              </label>
              <input
                id="enrollment"
                value={enrollment}
                onChange={(e) => setEnrollment(e.target.value)}
                autoComplete="username"
                aria-invalid={Boolean(error)}
                className={fieldClass}
                placeholder="2023CSE042"
              />
            </div>

            <div>
              <label htmlFor="name" className={labelClass}>
                Full Name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className={fieldClass}
                placeholder="Aarav Mehta"
              />
            </div>

            <div>
              <label htmlFor="branch" className={labelClass}>
                Branch
              </label>
              <select
                id="branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className={fieldClass}
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b} className="bg-surface text-foreground">
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="section" className={labelClass}>
                  Section
                </label>
                <select
                  id="section"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className={fieldClass}
                >
                  {SECTIONS.map((s) => (
                    <option key={s} value={s} className="bg-surface text-foreground">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="year" className={labelClass}>
                  Year
                </label>
                <select
                  id="year"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className={fieldClass}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-surface text-foreground">
                      Year {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={fieldClass}
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirm" className={labelClass}>
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className={fieldClass}
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

            <button
              type="submit"
              disabled={loading}
              className="btn-hero mt-2 w-full rounded-2xl py-3.5 font-display text-sm font-bold text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70"
            >
              {loading ? "Creating account…" : "Sign Up"}
            </button>

            <p className="pt-1 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
