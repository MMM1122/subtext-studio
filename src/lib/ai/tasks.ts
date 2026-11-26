/** Shared (client + server) definitions of AI assistant tasks. */
export const AI_TASKS = {
  brainstorm: { label: "Brainstorm possibilities", needs: "context" },
  motivation: { label: "Character motivation analysis", needs: "context" },
  consistency: { label: "Narrative consistency review", needs: "context" },
  alternatives: { label: "Alternative plot directions", needs: "context" },
  foreshadowing: { label: "Foreshadowing analysis", needs: "context" },
  dialogue: { label: "Dialogue feedback", needs: "text" },
  revision: { label: "Revise selected passage", needs: "selection" },
  style: { label: "Writing style feedback", needs: "text" },
} as const;

export type AITask = keyof typeof AI_TASKS;

export const AI_MAX_INPUT_CHARS = 48_000;

export interface AIStatus {
  configured: boolean;
  provider: string | null;
  model: string | null;
}

export interface AIRequest {
  task: AITask;
  text: string;
  context?: string;
  instruction?: string;
  consent: true;
}

export interface AIResponse {
  output: string;
  provider: string;
  model: string;
}
