// -----------------------------------------------------------------------------
// CREDITS vs REPUTATION — the core rule staff must respect
// Awarding event points raises BOTH credits (spendable) and reputation (standing).
// Team bonuses and penalties change REPUTATION only.
// Checkpoint bonuses pay CREDITS only, based on reputation standing.
// -----------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Check,
  ClipboardList,
  LogOut,
  Gift,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";


import { supabase } from "@/integrations/supabase/client";
import {
  clearStaffSession,
  loadStaffSession,
  saveStaffSession,
  type StaffSession,
} from "@/lib/staff-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Staff Panel — CampCredit" },
      {
        name: "description",
        content:
          "CampCredit staff panel for teachers and club heads: approve campus events, manage registrations and award credit points to students.",
      },
      { property: "og:title", content: "Staff Panel — CampCredit" },
      {
        property: "og:description",
        content: "Approve events, review registrations and award campus credits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Tab = "pending" | "live" | "create" | "vouchers" | "penalty";

type StaffVoucher = {
  id: string;
  student_name: string;
  enrollment_number: string;
  reward_name: string;
  points_cost: number;
  status: string;
  voucher_code: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// EVENT POINT PRESETS — guide rails so awards stay consistent across staff.
// staff_award_points() hard-caps a single award at 400 points, matching the
// top tier below. Staff can still type any custom number within that cap.
// ---------------------------------------------------------------------------
const AWARD_PRESETS: { label: string; hint: string; points: number }[] = [
  { label: "Participation", hint: "20–40", points: 30 },
  { label: "College-level win", hint: "150–250", points: 200 },
  { label: "State/National win", hint: "300–400", points: 350 },
  { label: "Volunteering", hint: "30–50", points: 40 },
  { label: "Helping organize", hint: "50–80", points: 65 },
];


type EventRow = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  team_required: boolean;
  status: string;
  created_by: string | null;
};

type StaffRegistration = {
  registration_id: string;
  student_id: string;
  student_name: string;
  enrollment_number: string;
  branch: string;
  section: string;
  year: number;
  team_name: string | null;
  reg_status: string;
  credit_balance: number;
};

const inputClass =
  "w-full rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground backdrop-blur-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";
const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const primaryBtn =
  "btn-hero rounded-full px-5 py-2.5 font-display text-[13px] font-bold text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70";
const ghostBtn =
  "rounded-full border border-border bg-surface/80 px-4 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground";

function formatDate(date: string | null) {
  if (!date) return "Date to be announced";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AdminPage() {
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStaff(loadStaffSession());
    setReady(true);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="blob -left-40 -top-40 h-[28rem] w-[28rem] bg-primary/10" />
      <div className="blob -right-32 bottom-0 h-[26rem] w-[26rem] bg-accent/20" />
      {!ready ? null : staff ? (
        <AdminDashboard staff={staff} onSignOut={() => { clearStaffSession(); setStaff(null); }} />
      ) : (
        <StaffLogin onAuthed={setStaff} />
      )}
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Staff login                                                                */
/* -------------------------------------------------------------------------- */

function StaffLogin({ onAuthed }: { onAuthed: (s: StaffSession) => void }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!code.trim() || !password) {
      setError("Enter both your staff code and password");
      return;
    }
    setLoading(true);
    // -----------------------------------------------------------------------
    // PLACEHOLDER AUTHENTICATION
    // Mock login against the `staff` table via the `staff_login` database
    // function. Replace with the university staff directory / SSO once the
    // data partnership is live — and scope each staff account to its own club.
    // -----------------------------------------------------------------------
    const { data, error: rpcError } = await supabase.rpc("staff_login", {
      p_staff_code: code.trim(),
      p_password: password,
    });
    setLoading(false);
    const row = Array.isArray(data) ? data[0] : null;
    if (rpcError || !row) {
      setError("Invalid staff code or password");
      return;
    }
    saveStaffSession(row as StaffSession);
    onAuthed(row as StaffSession);
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="animate-rise rounded-3xl border border-border bg-surface/70 p-8 backdrop-blur-sm">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-accent/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            <ShieldCheck className="h-3 w-3" /> Staff panel
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground">
            CampCredit
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your staff code to manage events and credits.
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
          <div>
            <label htmlFor="staff-code" className={labelClass}>
              Staff Code
            </label>
            <input
              id="staff-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="username"
              aria-invalid={Boolean(error)}
              className={cn(inputClass, "mt-1.5")}
              placeholder="T-CSE-04"
            />
          </div>
          <div>
            <label htmlFor="staff-password" className={labelClass}>
              Password
            </label>
            <input
              id="staff-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
              className={cn(inputClass, "mt-1.5")}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
            >
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className={cn(primaryBtn, "w-full")}>
            {loading ? "Signing in…" : "Log In"}
          </button>
          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            Lost your staff code? Contact the campus IT helpdesk.
          </p>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                   */
/* -------------------------------------------------------------------------- */

function AdminDashboard({ staff, onSignOut }: { staff: StaffSession; onSignOut: () => void }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,date,team_required,status,created_by")
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const pending = (events ?? []).filter((e) => e.status === "pending_approval");
  const live = (events ?? []).filter((e) => e.status === "live");

  const decide = useMutation({
    mutationFn: async (vars: { eventId: string; approve: boolean }) => {
      const { error } = await supabase.rpc("staff_approve_event", {
        p_staff_id: staff.id,
        p_event_id: vars.eventId,
        p_approve: vars.approve,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-events"] }),
  });

  const tabs: { key: Tab; label: string; icon: typeof ClipboardList; count?: number }[] = [
    { key: "pending", label: "Pending Approval", icon: ClipboardList, count: pending.length },
    { key: "live", label: "Live Events", icon: Sparkles, count: live.length },
    { key: "create", label: "Create Event", icon: Plus },
    { key: "vouchers", label: "Vouchers", icon: Gift },
    { key: "penalty", label: "Penalty", icon: ShieldAlert },
  ];


  return (
    <div className="relative mx-auto w-full max-w-6xl px-6 py-10 lg:px-10">
      <header className="animate-rise flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            CampCredit · Staff panel
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Event control room</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {staff.name} · {staff.department || staff.staff_code}
          </p>
        </div>
        <button onClick={onSignOut} className={cn(ghostBtn, "flex items-center gap-2")}>
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setSelectedEvent(null);
            }}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-200",
              tab === key
                ? "border-primary/55 bg-accent/55 text-foreground"
                : "border-border bg-surface/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {typeof count === "number" && (
              <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold">
                {count}
              </span>
            )}
          </button>
        ))}
      </nav>

      <section className="mt-8">
        {isLoading && <p className="text-sm text-muted-foreground">Loading events…</p>}

        {tab === "pending" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pending.map((event, i) => (
              <article
                key={event.id}
                className="animate-rise flex flex-col rounded-2xl border border-border bg-surface/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[var(--shadow-lift)]"
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <EventHead event={event} />
                <div className="mt-4 flex gap-2 pt-1">
                  <button
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ eventId: event.id, approve: true })}
                    className={cn(primaryBtn, "flex items-center gap-1.5 px-4 py-2 text-[12px]")}
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ eventId: event.id, approve: false })}
                    className="flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-70"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </article>
            ))}
            {!isLoading && pending.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing waiting for approval right now.</p>
            )}
          </div>
        )}

        {tab === "live" && (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <CheckpointPanel staff={staff} />
              <ClassRewardsPanel staff={staff} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">

            <div className="space-y-3">
              {live.map((event, i) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  style={{ animationDelay: `${i * 45}ms` }}
                  className={cn(
                    "animate-rise w-full rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
                    selectedEvent?.id === event.id
                      ? "border-primary/55 bg-accent/40"
                      : "border-border bg-surface/70 hover:border-primary/45",
                  )}
                >
                  <EventHead event={event} compact />
                </button>
              ))}
              {!isLoading && live.length === 0 && (
                <p className="text-sm text-muted-foreground">No live events yet.</p>
              )}
            </div>
            <div>
              {selectedEvent ? (
                <RegistrationsPanel staff={staff} event={selectedEvent} />
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center text-sm text-muted-foreground">
                  Select a live event to see who registered and award credits.
                </div>
              )}
            </div>
            </div>
          </div>
        )}


        {tab === "create" && <CreateEventForm staff={staff} onCreated={() => setTab("pending")} />}

        {tab === "vouchers" && <VouchersPanel staff={staff} />}

        {tab === "penalty" && <PenaltyPanel staff={staff} />}

      </section>
    </div>
  );
}

function EventHead({ event, compact = false }: { event: EventRow; compact?: boolean }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-sm font-bold leading-tight">{event.title}</h3>
        {event.team_required && (
          <span className="shrink-0 rounded-full bg-primary/25 px-2 py-0.5 text-[10px] font-medium text-primary">
            Team event
          </span>
        )}
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CalendarDays className="h-3 w-3" />
        {formatDate(event.date)}
        {event.created_by && <span className="truncate">· {event.created_by}</span>}
      </p>
      {!compact && event.description && (
        <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
          {event.description}
        </p>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Registrations + award points                                                */
/* -------------------------------------------------------------------------- */

function RegistrationsPanel({ staff, event }: { staff: StaffSession; event: EventRow }) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { points: string; note: string }>>({});
  const [awarded, setAwarded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    setDrafts({});
    setAwarded({});
    setError("");
  }, [event.id]);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-registrations", event.id],
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc("staff_event_registrations", {
        p_staff_id: staff.id,
        p_event_id: event.id,
      });
      if (rpcError) throw rpcError;
      return (data ?? []) as StaffRegistration[];
    },
  });

  const award = useMutation({
    mutationFn: async (vars: { studentId: string; points: number; note: string }) => {
      const { error: rpcError } = await supabase.rpc("staff_award_points", {
        p_staff_id: staff.id,
        p_student_id: vars.studentId,
        p_event_id: event.id,
        p_points: vars.points,
        p_description: vars.note,
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: (_d, vars) => {
      setAwarded((prev) => ({ ...prev, [vars.studentId]: true }));
      setDrafts((prev) => ({ ...prev, [vars.studentId]: { points: "", note: "" } }));
      queryClient.invalidateQueries({ queryKey: ["admin-registrations", event.id] });
    },
    onError: () => setError("Could not award points. Please try again."),
  });

  return (
    <div className="animate-rise rounded-2xl border border-border bg-surface/70 p-5">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-lg font-bold leading-tight">{event.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(event.date)}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-[11px] text-muted-foreground">
          <Users className="h-3 w-3" />
          {rows?.length ?? 0} registered
        </span>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
        >
          {error}
        </p>
      )}

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading registrations…</p>}
      {!isLoading && (rows ?? []).length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">No one has registered for this event yet.</p>
      )}

      <ul className="mt-4 space-y-3">
        {(rows ?? []).map((r) => {
          const draft = drafts[r.student_id] ?? { points: "", note: "" };
          return (
            <li
              key={r.registration_id}
              className="rounded-2xl border border-border bg-secondary/50 p-4 backdrop-blur-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-border bg-accent/50 font-display text-[12px] font-bold text-foreground/90">
                    {r.student_name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{r.student_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.enrollment_number} · {r.branch} {r.section} · Year {r.year}
                      {r.team_name ? ` · Team ${r.team_name}` : ""}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-foreground/10 px-3 py-1 text-[11px] text-muted-foreground">
                  {r.credit_balance.toLocaleString("en-IN")} credits
                </span>
              </div>

              {/* Quick-select presets guide the default; custom numbers still allowed. */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {AWARD_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() =>
                      setDrafts((prev) => ({
                        ...prev,
                        [r.student_id]: {
                          ...draft,
                          points: String(p.points),
                          note: draft.note || `${event.title} — ${p.label.toLowerCase()}`,
                        },
                      }))
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                      draft.points === String(p.points)
                        ? "border-primary/60 bg-accent/60 text-foreground"
                        : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {p.label}
                    <span className="ml-1.5 text-[10px] opacity-70">{p.hint}</span>
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">

                <input
                  aria-label={`Points for ${r.student_name}`}
                  inputMode="numeric"
                  value={draft.points}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [r.student_id]: { ...draft, points: e.target.value },
                    }))
                  }
                  placeholder="Points"
                  className={cn(inputClass, "w-full px-3 py-2 sm:w-28")}
                />
                <input
                  aria-label={`Reason for ${r.student_name}`}
                  value={draft.note}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [r.student_id]: { ...draft, note: e.target.value },
                    }))
                  }
                  placeholder={`e.g. ${event.title} — participation`}
                  className={cn(inputClass, "w-full flex-1 px-3 py-2 sm:min-w-[12rem]")}
                />
                <button
                  disabled={award.isPending}
                  onClick={() => {
                    setError("");
                    const points = Number(draft.points);
                    if (!Number.isFinite(points) || points === 0) {
                      setError("Enter a non-zero number of points");
                      return;
                    }
                    if (Math.abs(points) > 400) {
                      setError("Event awards are capped at 400 points");
                      return;
                    }

                    award.mutate({
                      studentId: r.student_id,
                      points: Math.trunc(points),
                      note: draft.note.trim() || `${event.title} — participation`,
                    });
                  }}
                  className={cn(primaryBtn, "px-4 py-2 text-[12px]")}
                >
                  Award
                </button>
                {awarded[r.student_id] && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                    <Check className="h-3 w-3" /> Awarded
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <TeamBonusPanel staff={staff} event={event} rows={rows ?? []} />
    </div>

  );
}

/* -------------------------------------------------------------------------- */
/* Create event                                                                */
/* -------------------------------------------------------------------------- */

function CreateEventForm({ staff, onCreated }: { staff: StaffSession; onCreated: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [teamRequired, setTeamRequired] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      const { error: rpcError } = await supabase.rpc("staff_create_event", {
        p_staff_id: staff.id,
        p_title: title.trim(),
        p_description: description.trim(),
        p_team_required: teamRequired,
        ...(date ? { p_date: date } : {}),
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setDate("");
      setTeamRequired(false);
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      onCreated();
    },
    onError: () => setError("Could not create the event. Please try again."),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        setDone(false);
        if (!title.trim()) {
          setError("Give the event a title");
          return;
        }
        create.mutate();
      }}
      noValidate
      className="animate-rise max-w-2xl space-y-4 rounded-2xl border border-border bg-surface/70 p-6"
    >
      <div>
        <label htmlFor="event-title" className={labelClass}>
          Title
        </label>
        <input
          id="event-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Robotics Club Demo Day"
          className={cn(inputClass, "mt-1.5")}
        />
      </div>
      <div>
        <label htmlFor="event-description" className={labelClass}>
          Description
        </label>
        <textarea
          id="event-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="What happens, who can join, what to bring."
          className={cn(inputClass, "mt-1.5 resize-none")}
        />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-56">
          <label htmlFor="event-date" className={labelClass}>
            Date
          </label>
          <input
            id="event-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cn(inputClass, "mt-1.5")}
          />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={teamRequired}
          onClick={() => setTeamRequired((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-4 py-2.5 text-[12px] font-medium transition-colors",
            teamRequired
              ? "border-primary/55 bg-accent/55 text-foreground"
              : "border-border bg-surface/70 text-muted-foreground hover:text-foreground",
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Team event
          <span
            className={cn(
              "ml-1 h-4 w-7 rounded-full p-0.5 transition-colors",
              teamRequired ? "bg-primary" : "bg-foreground/15",
            )}
          >
            <span
              className={cn(
                "block h-3 w-3 rounded-full bg-foreground transition-transform",
                teamRequired && "translate-x-3",
              )}
            />
          </span>
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
        >
          {error}
        </p>
      )}
      {done && (
        <p className="rounded-xl border border-primary/40 bg-accent/40 px-3 py-2 text-xs font-medium text-primary">
          Event submitted for approval.
        </p>
      )}

      <button type="submit" disabled={create.isPending} className={primaryBtn}>
        {create.isPending ? "Submitting…" : "Submit for approval"}
      </button>
      <p className="text-[11px] text-muted-foreground">
        New events start as pending approval and only appear to students once approved.
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Voucher desk — redemptions are instant now, so staff only mark codes used.  */
/* -------------------------------------------------------------------------- */

function VouchersPanel({ staff }: { staff: StaffSession }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["staff-vouchers", staff.id, query],
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc("staff_vouchers", {
        p_staff_id: staff.id,
        p_query: query.trim(),
      });
      if (rpcError) throw rpcError;
      return (data ?? []) as StaffVoucher[];
    },
  });

  const markUsed = useMutation({
    mutationFn: async (redemptionId: string) => {
      const { error: rpcError } = await supabase.rpc("staff_mark_voucher_used", {
        p_staff_id: staff.id,
        p_redemption_id: redemptionId,
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["staff-vouchers", staff.id] });
    },
    onError: () => setError("Could not update that voucher. Please try again."),
  });

  return (
    <div className="space-y-6">
      <div className="max-w-xl">
        <label htmlFor="voucher-search" className={labelClass}>
          Find a voucher
        </label>
        <input
          id="voucher-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Voucher code (CC-XXXX-XXXX) or student name"
          className={cn(inputClass, "mt-1.5")}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading vouchers…</p>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(rows ?? []).map((r, i) => {
          const used = r.status === "used";
          return (
            <article
              key={r.id}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cn(
                "animate-rise flex flex-col rounded-2xl border p-5",
                used ? "border-border/60 bg-surface/50" : "border-border bg-surface/70",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-base font-bold leading-tight">{r.reward_name}</h3>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize",
                    used ? "bg-success/20 text-success" : "bg-accent/60 text-primary",
                  )}
                >
                  {r.status}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {r.student_name} · {r.enrollment_number}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {formatDate(r.created_at.slice(0, 10))} · {r.points_cost.toLocaleString("en-IN")} pts
              </p>
              <p className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 px-3 py-2 font-mono text-[14px] font-bold tracking-[0.12em]">
                {r.voucher_code ?? "—"}
              </p>
              {!used && (
                <div className="mt-4 pt-1">
                  <button
                    disabled={markUsed.isPending}
                    onClick={() => markUsed.mutate(r.id)}
                    className={cn(primaryBtn, "flex items-center gap-1.5 px-4 py-2 text-[12px]")}
                  >
                    <Check className="h-3.5 w-3.5" /> Mark Used
                  </button>
                </div>
              )}
            </article>
          );
        })}
        {!isLoading && (rows ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No vouchers match that search.</p>
        )}
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Checkpoint bonuses (credits paid out for reputation standing)               */
/* -------------------------------------------------------------------------- */

function CheckpointPanel({ staff }: { staff: StaffSession }) {
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState("");

  // Manually triggered for now — a scheduled monthly job replaces this later.
  const run = useMutation({
    mutationFn: async () => {
      const { data, error: rpcError } = await supabase.rpc("run_checkpoint_bonuses", {
        p_staff_id: staff.id,
      });
      if (rpcError) throw rpcError;
      return (data ?? [])[0] ?? null;
    },
    onSuccess: (row) => {
      setError("");
      setResult(
        row
          ? `${row.position_bonuses} position bonuses and ${row.growth_bonuses} growth bonuses paid out in credits.`
          : "Checkpoint complete.",
      );
    },
    onError: () => setError("Could not run the checkpoint. Please try again."),
  });

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5">
      <h2 className="font-display text-base font-bold">Monthly checkpoint</h2>
      <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-muted-foreground">
        Pays spendable credits to the top 3 of every section, the top 3 course-wide, and anyone
        who improved their rank since the last checkpoint. Reputation is not changed.
      </p>
      <button
        disabled={run.isPending}
        onClick={() => run.mutate()}
        className={cn(primaryBtn, "mt-4")}
      >
        {run.isPending ? "Running…" : "Run Checkpoint Bonuses"}
      </button>
      {result && (
        <p className="mt-3 rounded-xl border border-primary/40 bg-accent/40 px-3 py-2 text-xs font-medium text-primary">
          {result}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Class rewards — top classes earn a store discount for all their members     */
/* -------------------------------------------------------------------------- */

function ClassRewardsPanel({ staff }: { staff: StaffSession }) {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  // Ranks classes by their reputation-based normalized score and grants:
  // 1st 20% / 30 days · 2nd 15% / 30 days · 3rd 10% / 30 days · 4th-5th 5% / 14 days.
  const run = useMutation({
    mutationFn: async () => {
      const { data, error: rpcError } = await supabase.rpc("apply_class_rewards", {
        p_staff_id: staff.id,
      });
      if (rpcError) throw rpcError;
      return (data ?? []) as { class_label: string; discount_percent: number }[];
    },
    onSuccess: (rows) => {
      setError("");
      setResult(
        rows.length
          ? rows.map((r) => `${r.class_label} · ${r.discount_percent}%`).join("  ·  ")
          : "No classes to reward yet.",
      );
    },
    onError: () => setError("Could not apply class rewards. Please try again."),
  });

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5">
      <h2 className="font-display text-base font-bold">Class rewards</h2>
      <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-muted-foreground">
        Gives the top 5 classes a store discount every member can use: 20%, 15% and 10% for 30
        days, then 5% for 14 days. Previous grants are cleared first.
      </p>
      <button
        disabled={run.isPending}
        onClick={() => run.mutate()}
        className={cn(primaryBtn, "mt-4")}
      >
        {run.isPending ? "Applying…" : "Apply Class Rewards"}
      </button>
      {result && (
        <p className="mt-3 rounded-xl border border-primary/40 bg-accent/40 px-3 py-2 text-xs font-medium text-primary">
          {result}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Team bonus (reputation only)                                                */
/* -------------------------------------------------------------------------- */

function TeamBonusPanel({
  staff,
  event,
  rows,
}: {
  staff: StaffSession;
  event: EventRow;
  rows: StaffRegistration[];
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [each, setEach] = useState("100");
  const [mvp, setMvp] = useState("");
  const [mvpBonus, setMvpBonus] = useState("50");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    setPicked([]);
    setMvp("");
    setDone("");
    setError("");
  }, [event.id]);

  const award = useMutation({
    mutationFn: async () => {
      const { data, error: rpcError } = await supabase.rpc("award_team_bonus", {
        p_staff_id: staff.id,
        p_event_id: event.id,
        p_student_ids: picked,
        p_reputation_each: Math.trunc(Number(each)),
        ...(mvp ? { p_mvp_student_id: mvp } : {}),
        p_mvp_bonus: mvp ? Math.trunc(Number(mvpBonus) || 0) : 0,
      });
      if (rpcError) throw rpcError;
      return (data ?? [])[0]?.awarded ?? picked.length;
    },
    onSuccess: (count) => {
      setError("");
      setDone(`Team reputation bonus given to ${count} students.`);
      setPicked([]);
      setMvp("");
    },
    onError: () => setError("Could not award the team bonus. Please try again."),
  });

  return (
    <div className="mt-6 rounded-2xl border border-primary/40 bg-accent/30 p-4">
      <h3 className="font-display text-sm font-bold">Team bonus (reputation)</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Adds standing to everyone on the team. Spendable credits are unaffected.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {rows.map((r) => {
          const on = picked.includes(r.student_id);
          return (
            <button
              key={r.student_id}
              onClick={() =>
                setPicked((prev) =>
                  on ? prev.filter((id) => id !== r.student_id) : [...prev, r.student_id],
                )
              }
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                on
                  ? "border-primary/60 bg-accent/65 text-foreground"
                  : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {r.student_name}
              {r.team_name ? ` · ${r.team_name}` : ""}
            </button>
          );
        })}
        {rows.length === 0 && (
          <p className="text-[12px] text-muted-foreground">No registrations to reward yet.</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          aria-label="Reputation per member"
          inputMode="numeric"
          value={each}
          onChange={(e) => setEach(e.target.value)}
          placeholder="Reputation each"
          className={cn(inputClass, "w-40 px-3 py-2")}
        />
        <select
          aria-label="MVP"
          value={mvp}
          onChange={(e) => setMvp(e.target.value)}
          className={cn(inputClass, "w-56 px-3 py-2")}
        >
          <option value="">No MVP</option>
          {rows
            .filter((r) => picked.includes(r.student_id))
            .map((r) => (
              <option key={r.student_id} value={r.student_id}>
                MVP · {r.student_name}
              </option>
            ))}
        </select>
        {mvp && (
          <input
            aria-label="MVP bonus"
            inputMode="numeric"
            value={mvpBonus}
            onChange={(e) => setMvpBonus(e.target.value)}
            placeholder="MVP bonus"
            className={cn(inputClass, "w-32 px-3 py-2")}
          />
        )}
        <button
          disabled={award.isPending}
          onClick={() => {
            setDone("");
            if (picked.length === 0) {
              setError("Pick at least one team member");
              return;
            }
            if (!Number.isFinite(Number(each)) || Number(each) === 0) {
              setError("Enter a non-zero reputation amount");
              return;
            }
            setError("");
            award.mutate();
          }}
          className={cn(primaryBtn, "px-4 py-2 text-[12px]")}
        >
          Award team bonus
        </button>
      </div>

      {done && (
        <p className="mt-3 text-[12px] font-medium text-primary">{done}</p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Penalty — deliberately severe styling, reputation only, always private      */
/* -------------------------------------------------------------------------- */

type SearchedStudent = {
  id: string;
  name: string;
  enrollment_number: string;
  branch: string;
  section: string;
  year: number;
  reputation: number;
  credit_balance: number;
};

function PenaltyPanel({ staff }: { staff: StaffSession }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<SearchedStudent | null>(null);
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const { data: results } = useQuery({
    queryKey: ["student-search", query],
    enabled: query.trim().length >= 2,
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc("staff_search_students", {
        p_staff_id: staff.id,
        p_query: query.trim(),
      });
      if (rpcError) throw rpcError;
      return (data ?? []) as SearchedStudent[];
    },
  });

  // Author-scoped: the database only returns penalties this staff member applied.
  const { data: myPenalties, refetch: refetchPenalties } = useQuery({
    queryKey: ["staff-my-penalties", staff.id],
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc("staff_my_penalties", {
        p_staff_id: staff.id,
      });
      if (rpcError) throw rpcError;
      return (data ?? []) as {
        id: string;
        student_name: string;
        enrollment_number: string;
        points: number;
        citation: string;
        created_at: string;
      }[];
    },
  });



  const penalise = useMutation({
    mutationFn: async () => {
      const { error: rpcError } = await supabase.rpc("apply_penalty", {
        p_staff_id: staff.id,
        p_student_id: picked!.id,
        p_points: -Math.abs(Math.trunc(Number(points))),
        p_reason: reason.trim(),
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: () => {
      setDone(`Penalty of ${Math.abs(Math.trunc(Number(points)))} reputation recorded.`);
      setError("");
      setConfirming(false);
      setPoints("");
      setReason("");
      setPicked(null);
      setQuery("");
      refetchPenalties();

    },
    onError: () => {
      setConfirming(false);
      setError("Could not apply the penalty. Please try again.");
    },
  });

  return (
    <div className="max-w-2xl rounded-2xl border-2 border-destructive/50 bg-destructive/5 p-6">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full border border-destructive/50 bg-destructive/15 text-destructive">
          <ShieldAlert className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-display text-base font-bold text-destructive">Apply penalty</h2>
          <p className="text-[11px] text-muted-foreground">
            Deducts reputation only — never credits. Recorded privately on the student&apos;s own
            achievement ledger. Use sparingly and always with a clear reason.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <label htmlFor="penalty-search" className={labelClass}>
            Student
          </label>
          <input
            id="penalty-search"
            value={picked ? `${picked.name} · ${picked.enrollment_number}` : query}
            onChange={(e) => {
              setPicked(null);
              setQuery(e.target.value);
            }}
            placeholder="Search by name or enrollment number"
            className={cn(inputClass, "mt-1.5")}
          />
          {!picked && (results ?? []).length > 0 && (
            <ul className="mt-2 space-y-1">
              {(results ?? []).map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setPicked(s)}
                    className="w-full rounded-xl border border-border bg-surface/70 px-3 py-2 text-left text-[12px] transition-colors hover:border-destructive/40"
                  >
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {s.enrollment_number} · {s.reputation} reputation
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="w-40">
            <label htmlFor="penalty-points" className={labelClass}>
              Reputation to remove
            </label>
            <input
              id="penalty-points"
              inputMode="numeric"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="50"
              className={cn(inputClass, "mt-1.5")}
            />
          </div>
          <div className="min-w-[16rem] flex-1">
            <label htmlFor="penalty-reason" className={labelClass}>
              Reason (citation)
            </label>
            <input
              id="penalty-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Misconduct during CodeStorm finals"
              className={cn(inputClass, "mt-1.5")}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-[12px] font-medium text-destructive">
            {error}
          </p>
        )}
        {done && <p className="text-[12px] font-medium text-primary">{done}</p>}

        {confirming ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
            <p className="text-[12px] font-medium text-destructive">
              Remove {Math.abs(Math.trunc(Number(points) || 0))} reputation from {picked?.name}?
            </p>
            <button
              disabled={penalise.isPending}
              onClick={() => penalise.mutate()}
              className="rounded-full border border-destructive/50 bg-destructive/20 px-4 py-2 text-[12px] font-bold text-destructive transition-colors hover:bg-destructive/30"
            >
              {penalise.isPending ? "Applying…" : "Yes, apply penalty"}
            </button>
            <button onClick={() => setConfirming(false)} className={ghostBtn}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setDone("");
              if (!picked) {
                setError("Choose a student first");
                return;
              }
              const n = Math.abs(Math.trunc(Number(points)));
              if (!Number.isFinite(n) || n <= 0) {
                setError("Enter how much reputation to remove");
                return;
              }
              if (!reason.trim()) {
                setError("A written reason is required");
                return;
              }
              setError("");
              setConfirming(true);
            }}
            className="rounded-full border border-destructive/50 bg-destructive/15 px-5 py-2.5 font-display text-[13px] font-bold text-destructive transition-colors hover:bg-destructive/25"
          >
            Review penalty
          </button>
        )}
      </div>

      {/* FLAW H — only penalties YOU applied are returned by staff_my_penalties().
          The filter lives in SQL, so another staff account cannot query them at
          all. A proper role model (e.g. a discipline committee role) is the real
          long-term fix; this is a deliberately narrow interim scope. */}
      <div className="mt-7 border-t border-destructive/25 pt-5">
        <h3 className={labelClass}>Penalties you applied</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Visible only to your staff account.
        </p>
        <ul className="mt-3 space-y-2">
          {(myPenalties ?? []).map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5"
            >
              <span className="text-[12px]">
                <span className="font-semibold">{p.student_name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {p.enrollment_number} · {p.citation}
                </span>
              </span>
              <span className="font-mono text-[12px] font-bold text-destructive">{p.points}</span>
            </li>
          ))}
          {(myPenalties ?? []).length === 0 && (
            <li className="text-[12px] text-muted-foreground">
              You haven&apos;t applied any penalties.
            </li>
          )}
        </ul>
      </div>

    </div>
  );
}

