import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  History,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { loadSession, type StudentSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/events")({
  ssr: false,
  component: EventsPage,
  head: () => ({
    meta: [
      { title: "Events — CampCredit" },
      {
        name: "description",
        content:
          "Browse live campus events, register solo or with a team, and track the events you have joined on CampCredit.",
      },
      { property: "og:title", content: "Events — CampCredit" },
      {
        property: "og:description",
        content: "Apply to live campus events and earn credits for taking part.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Tab = "live" | "mine";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  team_required: boolean;
  status: string;
};

type RegistrationRow = {
  id: string;
  event_id: string;
  team_name: string | null;
  status: string;
  created_at: string;
  title: string;
  description: string | null;
  date: string | null;
  team_required: boolean;
  event_status: string;
};

function formatDate(date: string | null) {
  if (!date) return "Date to be announced";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function EventsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [tab, setTab] = useState<Tab>("live");
  const [openTeamFor, setOpenTeamFor] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [formError, setFormError] = useState("");
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      navigate({ to: "/login", replace: true });
      return;
    }
    setStudent(session);
  }, [navigate]);

  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      // pending_approval events are never surfaced to students.
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,date,team_required,status")
        .in("status", ["live", "completed"])
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const { data: registrations } = useQuery({
    queryKey: ["event-registrations", student?.id],
    enabled: Boolean(student?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_event_registrations", {
        p_student_id: student!.id,
      });
      if (error) throw error;
      return (data ?? []) as RegistrationRow[];
    },
  });

  const registeredMap = useMemo(() => {
    const map = new Map<string, RegistrationRow>();
    (registrations ?? []).forEach((r) => map.set(r.event_id, r));
    return map;
  }, [registrations]);

  const liveEvents = (events ?? []).filter((e) => e.status === "live");
  const pastEvents = (events ?? []).filter((e) => e.status === "completed");

  const register = useMutation({
    mutationFn: async (vars: { eventId: string; team?: string }) => {
      const { error } = await supabase.rpc("register_for_event", {
        p_student_id: student!.id,
        p_event_id: vars.eventId,
        p_team_name: vars.team,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpenTeamFor(null);
      setTeamName("");
      setFormError("");
      queryClient.invalidateQueries({ queryKey: ["event-registrations", student?.id] });
    },
    onError: () => setFormError("Could not register right now. Please try again."),
  });

  const openReg = openTeamFor ? registeredMap.get(openTeamFor) : undefined;
  const teamQueryName = openReg?.team_name ?? "";

  const { data: teammates } = useQuery({
    queryKey: ["event-teammates", openTeamFor, teamQueryName],
    enabled: Boolean(openTeamFor && teamQueryName),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("event_teammates", {
        p_event_id: openTeamFor!,
        p_team_name: teamQueryName,
      });
      if (error) throw error;
      return (data ?? []) as { student_id: string; name: string; team_name: string }[];
    },
  });

  function renderEventCard(event: EventRow, index: number, readOnly = false) {
    const reg = registeredMap.get(event.id);
    const panelOpen = openTeamFor === event.id;
    return (
      <article
        key={event.id}
        className={cn(
          "animate-rise rounded-2xl border bg-surface/70 p-4 transition-all duration-200",
          reg ? "border-teal/55 bg-teal-deep/15" : "border-border",
          !readOnly && "hover:-translate-y-0.5 hover:border-teal/45 hover:shadow-[var(--shadow-lift)]",
        )}
        style={{ animationDelay: `${index * 45}ms` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold leading-tight">{event.title}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {formatDate(event.date)}
            </p>
          </div>
          {event.team_required && (
            <span className="shrink-0 rounded-full bg-teal/25 px-2 py-0.5 text-[10px] font-medium text-teal-light">
              Team event
            </span>
          )}
        </div>

        {event.description && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{event.description}</p>
        )}

        {!readOnly && (
          <div className="mt-3 flex items-center gap-2">
            {reg ? (
              <>
                <span className="flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal-deep/25 px-3 py-1.5 text-[11px] font-medium text-teal-light">
                  <Check className="h-3 w-3" />
                  Registered
                </span>
                {event.team_required && (
                  <button
                    onClick={() => {
                      setFormError("");
                      setTeamName(reg.team_name ?? "");
                      setOpenTeamFor(panelOpen ? null : event.id);
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Users className="h-3 w-3" />
                    {reg.team_name ? reg.team_name : "Set team"}
                  </button>
                )}
              </>
            ) : event.team_required ? (
              <button
                onClick={() => {
                  setFormError("");
                  setTeamName("");
                  setOpenTeamFor(panelOpen ? null : event.id);
                }}
                className="btn-hero rounded-full px-4 py-2 font-display text-[12px] font-bold text-[oklch(0.28_0.03_250)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                Apply with team
              </button>
            ) : (
              <button
                disabled={register.isPending}
                onClick={() => register.mutate({ eventId: event.id })}
                className="btn-hero rounded-full px-4 py-2 font-display text-[12px] font-bold text-[oklch(0.28_0.03_250)] transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70"
              >
                {register.isPending ? "Applying…" : "Apply"}
              </button>
            )}
          </div>
        )}

        {!readOnly && panelOpen && event.team_required && (
          <div className="animate-rise mt-3 rounded-2xl border border-border bg-white/5 p-3 backdrop-blur-sm">
            <label
              htmlFor={`team-${event.id}`}
              className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >
              Team name
            </label>
            <input
              id={`team-${event.id}`}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Byte Squad"
              className="mt-1.5 w-full rounded-xl border border-border bg-white/5 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40"
            />
            {formError && (
              <p
                role="alert"
                className="mt-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
              >
                {formError}
              </p>
            )}
            <button
              disabled={register.isPending}
              onClick={() => {
                const name = teamName.trim();
                if (!name) {
                  setFormError("Enter a team name to continue");
                  return;
                }
                register.mutate({ eventId: event.id, team: name });
              }}
              className="btn-hero mt-3 w-full rounded-xl py-2.5 font-display text-[12px] font-bold text-[oklch(0.28_0.03_250)] transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70"
            >
              {register.isPending ? "Saving…" : reg ? "Update team" : "Join team"}
            </button>

            {reg?.team_name && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Teammates in {reg.team_name}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {(teammates ?? []).map((t) => (
                    <li key={t.student_id} className="flex items-center gap-2 text-xs">
                      <span className="grid h-6 w-6 place-items-center rounded-full border border-border bg-teal-deep/25 font-display text-[10px] font-bold text-cream/90">
                        {t.name.charAt(0)}
                      </span>
                      <span className="truncate">
                        {t.name}
                        {t.student_id === student?.id && (
                          <span className="ml-1.5 text-[10px] text-teal-light">You</span>
                        )}
                      </span>
                    </li>
                  ))}
                  {(teammates ?? []).length <= 1 && (
                    <li className="text-[11px] text-muted-foreground">
                      No one else has joined this team yet.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </article>
    );
  }

  return (
    <main className="flex min-h-screen justify-center bg-[oklch(0.278_0.026_258)] py-0 sm:py-8">
      <div className="relative flex w-full max-w-[390px] flex-col overflow-hidden bg-background sm:rounded-[36px] sm:border sm:border-border sm:shadow-[0_40px_120px_-40px_rgba(0,0,0,0.7)]">
        <div className="blob -left-24 -top-20 h-64 w-64 bg-teal/12" />
        <div className="blob -right-28 top-72 h-72 w-72 bg-sand/8" />

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
              <h1 className="font-display text-xl font-bold tracking-tight">Events</h1>
              <p className="text-xs text-muted-foreground">Take part and earn campus credits</p>
            </div>
          </header>

          {/* Segmented control */}
          <div className="relative mt-5 grid grid-cols-2 rounded-2xl border border-border bg-surface/70 p-1">
            <span
              className={cn(
                "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-teal-deep/45 shadow-[var(--shadow-lift)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                tab === "mine" && "translate-x-[calc(100%+0.5rem)]",
              )}
            />
            {(
              [
                { key: "live", label: "Live", Icon: Clock },
                { key: "mine", label: "My Events", Icon: Check },
              ] as const
            ).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "relative z-10 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-medium transition-colors duration-200",
                  tab === key ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="mt-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-border bg-surface/50"
                />
              ))}
            </div>
          ) : tab === "live" ? (
            <section className="mt-5 space-y-3">
              {liveEvents.map((e, i) => renderEventCard(e, i))}
              {liveEvents.length === 0 && (
                <p className="rounded-2xl border border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">
                  No live events right now. Check back soon.
                </p>
              )}
            </section>
          ) : (
            <section className="mt-5 space-y-3">
              {(registrations ?? []).map((r, i) => (
                <article
                  key={r.id}
                  className="animate-rise rounded-2xl border border-teal/45 bg-teal-deep/15 p-4"
                  style={{ animationDelay: `${i * 45}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-bold leading-tight">{r.title}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(r.date)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-teal/25 px-2 py-0.5 text-[10px] font-medium capitalize text-teal-light">
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {r.team_required
                      ? `Team event · ${r.team_name ? `Team ${r.team_name}` : "No team name set"}`
                      : "Solo entry"}
                    {" · "}
                    {r.event_status === "completed" ? "Completed" : "Live"}
                  </p>
                </article>
              ))}
              {(registrations ?? []).length === 0 && (
                <p className="rounded-2xl border border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">
                  You haven't applied to any events yet.
                </p>
              )}
            </section>
          )}

          {/* Past events */}
          {pastEvents.length > 0 && (
            <section className="mt-7">
              <button
                onClick={() => setShowPast((v) => !v)}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface/60 px-4 py-3 text-left transition-colors hover:border-teal/40"
              >
                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  Past events ({pastEvents.length})
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-300",
                    showPast && "rotate-180",
                  )}
                />
              </button>
              {showPast && (
                <div className="mt-3 space-y-3 opacity-80">
                  {pastEvents.map((e, i) => renderEventCard(e, i, true))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
