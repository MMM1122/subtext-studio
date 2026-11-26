import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvider, getStatus } from "@/lib/ai/providers";
import { buildUserPrompt, SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { AI_MAX_INPUT_CHARS, AI_TASKS, type AITask } from "@/lib/ai/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports whether an AI provider is configured (never exposes keys). */
export async function GET() {
  return NextResponse.json(getStatus(), { headers: { "cache-control": "no-store" } });
}

const bodySchema = z.object({
  task: z.enum(Object.keys(AI_TASKS) as [AITask, ...AITask[]]),
  text: z.string().min(1).max(AI_MAX_INPUT_CHARS),
  context: z.string().max(12_000).optional(),
  instruction: z.string().max(1_000).optional(),
  consent: z.literal(true),
});

export async function POST(req: Request) {
  const provider = getProvider();
  if (!provider) {
    return NextResponse.json({ error: "No AI provider is configured on this server." }, { status: 503 });
  }
  let body: z.infer<typeof bodySchema>;
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: " + (parsed.error.issues[0]?.message ?? "") }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  try {
    const output = await provider.complete(SYSTEM_PROMPT, buildUserPrompt(body.task, body.text, body.context, body.instruction), AbortSignal.timeout(90_000));
    if (!output) return NextResponse.json({ error: "The provider returned an empty response." }, { status: 502 });
    return NextResponse.json({ output, provider: provider.name, model: provider.model }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI request failed." }, { status: 502 });
  }
}
