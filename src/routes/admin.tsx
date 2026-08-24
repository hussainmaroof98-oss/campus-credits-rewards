import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Check,
  ClipboardList,
  LogOut,
  Plus,
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

type Tab = "pending" | "live" | "create";

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
  "w-full rounded-2xl border border-border bg-white/5 px-4 py-3 text-sm text-foreground backdrop-blur-sm placeholder:text-muted-foreground/60 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40";
const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const primaryBtn =
  "btn-hero rounded-full px-5 py-2.5 font-display text-[13px] font-bold text-[oklch(0.28_0.03_250)] transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70";
const ghostBtn =
  "rounded-full border border-border bg-surface/80 px-4 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:border-teal/45 hover:text-foreground";

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
      <div className="blob -left-40 -top-40 h-[28rem] w-[28rem] bg-teal/12" />
      <div className="blob -right-32 bottom-0 h-[26rem] w-[26rem] bg-teal-light/10" />
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal-deep/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-light">
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
  ];

  return (
    <div className="relative mx-auto w-full max-w-6xl px-6 py-10 lg:px-10">
      <header className="animate-rise flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-light">
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
                ? "border-teal/55 bg-teal-deep/30 text-foreground"
                : "border-border bg-surface/60 text-muted-foreground hover:border-teal/40 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {typeof count === "number" && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold">
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
                className="animate-rise flex flex-col rounded-2xl border border-border bg-surface/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal/45 hover:shadow-[var(--shadow-lift)]"
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
                      ? "border-teal/55 bg-teal-deep/20"
                      : "border-border bg-surface/70 hover:border-teal/45",
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
        )}

        {tab === "create" && <CreateEventForm onCreated={() => setTab("pending")} />}
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
          <span className="shrink-0 rounded-full bg-teal/25 px-2 py-0.5 text-[10px] font-medium text-teal-light">
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
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-white/5 px-3 py-1 text-[11px] text-muted-foreground">
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
              className="rounded-2xl border border-border bg-white/5 p-4 backdrop-blur-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-border bg-teal-deep/25 font-display text-[12px] font-bold text-cream/90">
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
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-muted-foreground">
                  {r.credit_balance.toLocaleString("en-IN")} credits
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
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
                  className={cn(inputClass, "w-28 px-3 py-2")}
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
                  className={cn(inputClass, "min-w-[12rem] flex-1 px-3 py-2")}
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
                  <span className="flex items-center gap-1 text-[11px] font-medium text-teal-light">
                    <Check className="h-3 w-3" /> Awarded
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Create event                                                                */
/* -------------------------------------------------------------------------- */

function CreateEventForm({ onCreated }: { onCreated: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [teamRequired, setTeamRequired] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      const { error: insertError } = await supabase.from("events").insert({
        title: title.trim(),
        description: description.trim() || null,
        date: date || null,
        team_required: teamRequired,
        status: "pending_approval",
      });
      if (insertError) throw insertError;
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
              ? "border-teal/55 bg-teal-deep/30 text-foreground"
              : "border-border bg-surface/70 text-muted-foreground hover:text-foreground",
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Team event
          <span
            className={cn(
              "ml-1 h-4 w-7 rounded-full p-0.5 transition-colors",
              teamRequired ? "bg-teal" : "bg-white/15",
            )}
          >
            <span
              className={cn(
                "block h-3 w-3 rounded-full bg-cream transition-transform",
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
        <p className="rounded-xl border border-teal/40 bg-teal-deep/20 px-3 py-2 text-xs font-medium text-teal-light">
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
