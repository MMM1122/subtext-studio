import type { AITask } from "./tasks";

export const SYSTEM_PROMPT = `You are a careful creative-writing collaborator inside Subtext Studio, an author-first novel-writing tool.
Principles:
- The author owns the work. Offer observations, questions and options; never claim authority over their story.
- Preserve the author's voice, language and register. If the text is Chinese, answer in Chinese; if mixed, follow the author's mix.
- Be specific: quote short phrases from the provided text when pointing at something.
- Do not invent facts about the manuscript beyond what is provided; say when the excerpt is insufficient.
- Character psychology comments are literary interpretation, not clinical assessment.
- Keep responses concise and well structured (short headings or bullets).`;

const TASK_PROMPTS: Record<AITask, string> = {
  brainstorm: "Brainstorm 5–8 distinct possibilities the author could explore next, each in one or two sentences. Vary them in tone and risk.",
  motivation:
    "Analyse the motivations of the characters visible in this excerpt: what they want, what they fear, what they might be hiding, and where their behaviour seems under-motivated. Frame as questions the author could answer.",
  consistency:
    "Review the excerpt for narrative consistency: contradictions in facts, timeline, point of view, or character knowledge. List concrete issues with short quotes; say clearly if you find none.",
  alternatives: "Propose 3–4 alternative plot directions from this point, each with its likely consequence for tension and character arcs.",
  foreshadowing:
    "Identify possible foreshadowing, planted details or Chekhov's guns in the excerpt and suggest how/when each might pay off. Note any details that seem planted but unresolved.",
  dialogue: "Give feedback on the dialogue: subtext, distinct voices, rhythm, exposition. Suggest small, optional tweaks — do not rewrite whole exchanges.",
  revision:
    "Offer ONE revised version of the selected passage that keeps the author's voice, meaning and language. Output only the revised passage first, then a line '---' and 2–3 brief notes on what you changed and why.",
  style: "Give feedback on prose style: sentence rhythm, imagery, clarity, repetition. Point to specific phrases. Keep it constructive and brief.",
};

export function buildUserPrompt(task: AITask, text: string, context?: string, instruction?: string) {
  const parts = [TASK_PROMPTS[task]];
  if (instruction?.trim()) parts.push(`Author's note: ${instruction.trim()}`);
  if (context?.trim()) parts.push(`<story_context>\n${context.trim()}\n</story_context>`);
  parts.push(`<manuscript_excerpt>\n${text}\n</manuscript_excerpt>`);
  return parts.join("\n\n");
}
