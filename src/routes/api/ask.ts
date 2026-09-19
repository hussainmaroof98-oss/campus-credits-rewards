import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  exposedRunIdHeaders,
  gatewayHeaders,
  getLovableAiGatewayRunId,
} from "@/lib/ai-gateway.server";

const AskInput = z.object({
  studentId: z.string().uuid(),
  question: z.string().trim().min(2).max(1200),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(3000),
      }),
    )
    .max(8)
    .default([]),
});

function safeMessage(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "message" in value && typeof value.message === "string") {
    return value.message;
  }
  return fallback;
}

async function handleAsk(request: Request) {
  let input: z.infer<typeof AskInput>;
  try {
    input = AskInput.parse(await request.json());
  } catch {
    return Response.json({ message: "Please enter a valid question." }, { status: 400 });
  }

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return Response.json({ message: "Lovable AI is not configured for this app." }, { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: student } = await supabaseAdmin
    .from("students")
    .select("id,name,enrollment_number,branch,section,year,credit_balance,reputation,personal_rank,is_campus_plus")
    .eq("id", input.studentId)
    .maybeSingle();

  if (!student) {
    return Response.json({ message: "Your student profile could not be found." }, { status: 404 });
  }

  const [statsResult, creditsResult, achievementsResult, rewardsResult, vouchersResult, eventsResult, classesResult] =
    await Promise.all([
      supabaseAdmin.rpc("student_stats", { p_student_id: student.id }),
      supabaseAdmin
        .from("point_ledger")
        .select("source,points,description,created_at")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabaseAdmin
        .from("achievements")
        .select("source,points,citation,created_at")
        .eq("student_id", student.id)
        .eq("is_private", false)
        .order("created_at", { ascending: false })
        .limit(8),
      supabaseAdmin.from("rewards").select("name,points_cost,uses_label,active").eq("active", true),
      supabaseAdmin.rpc("my_redemptions", { p_student_id: student.id }),
      supabaseAdmin
        .from("events")
        .select("title,description,date,team_required,status")
        .in("status", ["live", "completed"])
        .order("date", { ascending: true })
        .limit(12),
      supabaseAdmin.rpc("class_leaderboard"),
    ]);

  const context = {
    student,
    stats: statsResult.data?.[0] ?? null,
    recentCreditActivity: creditsResult.data ?? [],
    recentAchievements: achievementsResult.data ?? [],
    rewards: rewardsResult.data ?? [],
    vouchers: (vouchersResult.data ?? []).slice(0, 8),
    events: eventsResult.data ?? [],
    classLeaderboard: (classesResult.data ?? []).slice(0, 12),
  };

  const conversation = input.history.map((message) => ({
    role: message.role,
    content: [{ type: message.role === "assistant" ? "output_text" : "input_text", text: message.content }],
  }));
  conversation.push({ role: "user", content: [{ type: "input_text", text: input.question }] });

  const initialRunId = getLovableAiGatewayRunId(request);
  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: gatewayHeaders(apiKey, initialRunId),
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "medium", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      instructions:
        "You are Ask CampCredit, a concise campus rewards guide. Answer only questions about this student's credits, reputation, rankings, rewards, vouchers, events, or Campus Plus. Use only the supplied live app data. Clearly distinguish spendable credits from reputation, which controls ranking and cannot be spent. Private penalties are never supplied and must never be inferred. If the data does not answer something, say so and point to the relevant CampCredit screen. Use short plain-text paragraphs or bullets, no Markdown symbols, and Indian number formatting where useful.",
      input: [
        {
          role: "developer",
          content: [{ type: "input_text", text: `Current CampCredit data:\n${JSON.stringify(context)}` }],
        },
        ...conversation,
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    let payload: unknown;
    try {
      payload = await upstream.json();
    } catch {
      payload = null;
    }
    return Response.json(
      { message: safeMessage(payload, "Lovable AI could not answer right now.") },
      { status: upstream.status, headers: exposedRunIdHeaders(upstream, initialRunId) },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: exposedRunIdHeaders(upstream, initialRunId),
  });
}

export const Route = createFileRoute("/api/ask")({
  server: { handlers: { POST: ({ request }) => handleAsk(request) } },
});
