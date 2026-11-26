import "server-only";
import type { AIStatus } from "./tasks";

/**
 * Server-only AI provider abstraction. API keys are read from environment
 * variables at request time and never sent to the browser.
 *
 *   AI_PROVIDER = "anthropic" | "openai"   (optional; inferred from which key is set)
 *   ANTHROPIC_API_KEY / OPENAI_API_KEY
 *   AI_MODEL   (optional override)
 *   OPENAI_BASE_URL (optional, for OpenAI-compatible endpoints)
 */
export interface AIProvider {
  name: string;
  model: string;
  complete(system: string, user: string, signal?: AbortSignal): Promise<string>;
}

class AnthropicProvider implements AIProvider {
  name = "anthropic";
  constructor(
    private key: string,
    public model: string,
  ) {}
  async complete(system: string, user: string, signal?: AbortSignal) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": this.key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: this.model, max_tokens: 1800, system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    return (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim();
  }
}

class OpenAIProvider implements AIProvider {
  name = "openai";
  constructor(
    private key: string,
    public model: string,
    private baseUrl: string,
  ) {}
  async complete(system: string, user: string, signal?: AbortSignal) {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${this.key}` },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI-compatible API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  }
}

export function getProvider(): AIProvider | null {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if ((explicit === "anthropic" || (!explicit && anthropicKey)) && anthropicKey) {
    return new AnthropicProvider(anthropicKey, process.env.AI_MODEL || "claude-sonnet-5-5");
  }
  if ((explicit === "openai" || (!explicit && openaiKey)) && openaiKey) {
    const model = process.env.AI_MODEL;
    if (!model) return null; // require explicit model for OpenAI-compatible endpoints
    return new OpenAIProvider(openaiKey, model, process.env.OPENAI_BASE_URL || "https://api.openai.com/v1");
  }
  return null;
}

export function getStatus(): AIStatus {
  const p = getProvider();
  return { configured: !!p, provider: p?.name ?? null, model: p?.model ?? null };
}
