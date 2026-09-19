import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, BrainCircuit, Send, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { loadSession, type StudentSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string; reasoning?: string };
const STORAGE_KEY = "campcredit.ask-history";
const suggestions = [
  "How many credits can I spend right now?",
  "What rewards can I afford?",
  "How is my class ranking calculated?",
  "Which live events can I join?",
];

export const Route = createFileRoute("/ask")({
  ssr: false,
  component: AskPage,
  head: () => ({
    meta: [
      { title: "Ask CampCredit — Personal campus rewards guide" },
      { name: "description", content: "Get personalized answers about your CampCredit balance, rewards, events, and rankings." },
      { property: "og:title", content: "Ask CampCredit — Personal campus rewards guide" },
      { property: "og:description", content: "Ask questions about your credits, rewards, events, and campus ranking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AskPage() {
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      navigate({ to: "/login", replace: true });
      return;
    }
    setStudent(session);
    try {
      const saved = window.localStorage.getItem(`${STORAGE_KEY}.${session.id}`);
      if (saved) setMessages(JSON.parse(saved) as ChatMessage[]);
    } catch {
      setMessages([]);
    }
  }, [navigate]);

  useEffect(() => {
    if (!student) return;
    window.localStorage.setItem(`${STORAGE_KEY}.${student.id}`, JSON.stringify(messages.slice(-12)));
  }, [messages, student]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !student || loading) return;
    setError("");
    setReasoning("");
    setQuestion("");
    setLoading(true);
    const prior = messages.slice(-8).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    controller.current = new AbortController();

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.current.signal,
        body: JSON.stringify({ studentId: student.id, question: trimmed, history: prior }),
      });
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Lovable AI could not answer right now.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      let thinking = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          const line = block.split("\n").find((part) => part.startsWith("data:"));
          if (!line) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === "[DONE]") continue;
          const event = JSON.parse(raw) as { type?: string; delta?: string };
          if (event.type === "response.output_text.delta" && event.delta) answer += event.delta;
          if (event.type === "response.reasoning_summary_text.delta" && event.delta) thinking += event.delta;
          setReasoning(thinking);
          setMessages((current) => {
            const withoutDraft = current.filter((item) => item.role !== "assistant" || item.content !== "");
            const last = withoutDraft[withoutDraft.length - 1];
            if (last?.role === "assistant") return [...withoutDraft.slice(0, -1), { ...last, content: answer, reasoning: thinking }];
            return [...withoutDraft, { role: "assistant", content: answer, reasoning: thinking }];
          });
        }
      }
      if (!answer) throw new Error(thinking || "Lovable AI returned no answer.");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Lovable AI could not answer right now.");
    } finally {
      setLoading(false);
      controller.current = null;
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <main className="app-stage">
      <div className="app-shell flex min-h-screen flex-col">
        <div className="blob -left-24 -top-20 h-64 w-64 bg-primary/10" />
        <div className="blob -right-28 top-72 h-72 w-72 bg-accent/20" />
        <div className="relative flex min-h-screen flex-1 flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
          <header className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate({ to: "/" })} aria-label="Back to home" className="rounded-full bg-surface/80">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 font-display text-xl font-bold"><BrainCircuit className="h-5 w-5 text-primary" />Ask CampCredit</h1>
              <p className="truncate text-xs text-muted-foreground">Personal answers from your live campus data</p>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" aria-label="Clear conversation" onClick={() => setMessages([])}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </header>

          <section className="mt-5 flex-1 space-y-3" aria-live="polite">
            {messages.length === 0 && (
              <div className="rounded-3xl border border-border bg-surface/70 p-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/55 text-primary"><Sparkles className="h-4 w-4" /></span>
                <h2 className="mt-4 font-display text-lg font-bold">What would you like to know?</h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {suggestions.map((item) => (
                    <Button key={item} variant="outline" onClick={() => void ask(item)} className="h-auto justify-start whitespace-normal rounded-2xl bg-secondary/45 px-3 py-3 text-left text-xs leading-relaxed">
                      {item}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={cn("max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-relaxed", message.role === "user" ? "ml-auto border-primary/45 bg-accent/55" : "mr-auto border-border bg-surface/80")}>
                {message.reasoning && message.role === "assistant" && (
                  <details className="mb-2 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium">How I checked</summary><p className="mt-2 whitespace-pre-wrap">{message.reasoning}</p></details>
                )}
                <p className="whitespace-pre-wrap">{message.content || "Thinking…"}</p>
              </article>
            ))}
            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="mr-auto rounded-2xl border border-border bg-surface/80 px-4 py-3 text-sm text-muted-foreground">{reasoning || "Checking your CampCredit data…"}</div>
            )}
            {error && <p role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
          </section>

          <form onSubmit={submit} className="sticky bottom-0 mt-4 flex items-end gap-2 border-t border-border bg-background/90 pt-3 backdrop-blur-xl">
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(question); } }} rows={1} placeholder="Ask about credits, rewards, events…" className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/35" />
            <Button type={loading ? "button" : "submit"} size="icon" onClick={loading ? () => controller.current?.abort() : undefined} aria-label={loading ? "Stop response" : "Send question"} className="h-11 w-11 rounded-full">
              {loading ? <span className="h-3 w-3 rounded-sm bg-primary-foreground" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
