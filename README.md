# Subtext Studio

A cognitive storytelling workspace for novel writing, character psychology, nonlinear narratives, and human-AI collaborative creativity.

**Live:** https://subtext-studio-ebon.vercel.app

> **AI should extend human creativity, not replace human agency.**
> Subtext Studio is an author-first, local-first writing tool, not a publishing platform or an automatic novel generator.

It combines a rich-text manuscript editor with structured tools for the parts of a novel that live *beneath* the text: who knows what and when (Knowledge Matrix), when things happen vs. when readers learn about them (dual timeline), how characters change (state history), and how a book is meant to feel (Reader Lab).

## Modules

| Module | What it does |
| --- | --- |
| **Library** | Create, edit, duplicate, archive, delete projects; covers, word counts, recent activity, "continue writing", JSON import/export. Includes an original bilingual demo project. |
| **Writing Studio** | Chapters & scenes (drag to reorder), Tiptap rich-text editor, debounced autosave with a visible indicator, undo/redo, find & replace, Chinese character + English word counts, chapter/daily/manuscript goals, chapter status, chapter notes, manual version snapshots with safe restore, focus mode. |
| **Character Lab** | Full character profiles, author-defined custom fields, React Flow relationship graph (type, direction, description, optional strength), per-chapter state snapshots with author-defined variables and a chart. |
| **Narrative Lab** | Dual timeline (chronological vs. narrative order, independently draggable, connected and highlighted across both), computed flashback / flash-forward markers, nonlinearity index, parallel tracks, subjective character time, causal dependency checks. |
| **Knowledge Matrix** | Facts × agents (characters, Reader, Author) with Unknown / Known / Suspected / Misunderstood states stored as chapter-anchored history; reasons; disclosure-over-time view; reader-vs-character gap analysis (dramatic irony, reader in the dark, misbelief); action-vs-knowledge consistency checks. |
| **Reader Lab** | Author-estimated experience curves (emotional intensity, tension, suspense, uncertainty, information density, pacing) and a foreshadowing tracker with span visualisation and payoff checks. |
| **Idea Vault** | Quick capture, typed notes, tags, search, pinning, chapter links, convert notes into characters / events / scenes, and full-text search across the whole project. |
| **AI Assistant** | Optional. Pluggable server-side provider (Anthropic or OpenAI-compatible). Explicit consent, suggestions shown separately, never applied without approval. Disabled — and clearly labelled — when not configured. |

See [USER_GUIDE.md](USER_GUIDE.md) for how to use each module.

## Quick start

Requirements: Node.js ≥ 20.9 (22 LTS recommended), npm.

```bash
git clone https://github.com/MMM1122/subtext-studio.git
cd subtext-studio
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run lint         # ESLint (Next.js + React hooks rules)
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit/integration tests (fake IndexedDB)
npm run build        # production build
npm run check        # all of the above
```

End-to-end workflow tests (Playwright, Python) are in [`e2e/`](e2e) — see [TESTING.md](TESTING.md).

## Where your data lives (please read)

- **Everything is stored locally in your browser's IndexedDB** (database name `subtext-studio`). No account, no server database, no analytics, no tracking.
- Your manuscript is **never uploaded** unless you configure an AI provider *and* explicitly consent *and* press "Send" for a specific excerpt.
- **Browser storage can be lost.** Clearing site data, private/incognito windows, some privacy extensions, switching browser profiles or devices, or the browser evicting storage under disk pressure will make your projects unavailable. Settings → *Request persistent storage* lowers (but does not remove) the eviction risk.
- **Back up regularly.** Each project's menu → *Export backup (.json)* produces a complete, human-readable backup (all chapters, snapshots, characters, timelines, knowledge records, notes). Settings → *Export all projects* exports the whole library.
- **Restore** with Library → *Import backup*. Imports are validated, re-keyed with fresh ids and added as a **new** project — existing projects are never overwritten.
- Manuscripts can also be exported as **Markdown** or **plain text** at any time. No lock-in.

## Optional AI configuration

AI is off by default. To enable it, set server-side environment variables (never `NEXT_PUBLIC_*`):

```bash
cp .env.example .env.local
# then set ANTHROPIC_API_KEY=...   (optional AI_MODEL, default claude-sonnet-5-5)
# or AI_PROVIDER=openai + OPENAI_API_KEY + AI_MODEL (+ OPENAI_BASE_URL)
```

Keys are only read inside `src/app/api/ai/route.ts` (`server-only`). The browser only learns whether a provider is configured.

## Deploying to Vercel

The app is a standard Next.js 16 project and needs no database or environment variables.

1. Push the repository to GitHub.
2. In Vercel → *Add New Project* → import the repository. Framework preset **Next.js** is detected automatically; keep the default build (`next build`) and output settings.
3. (Optional) Add `ANTHROPIC_API_KEY` (and `AI_MODEL`) under *Settings → Environment Variables* to enable the AI assistant, then redeploy.
4. Deploy. Every push to `main` redeploys automatically.

CLI alternative: `npm i -g vercel && vercel` (preview) / `vercel --prod`.

Because data is stored per browser, each deployment URL (origin) has its own separate local library. Export a backup before switching domains.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — technology choices, module communication, persistence.
- [DATA_MODEL.md](DATA_MODEL.md) — entities, indexes, history semantics, migrations, backup format.
- [USER_GUIDE.md](USER_GUIDE.md) — how to use each module.
- [TESTING.md](TESTING.md) — automated and end-to-end tests and results.
- [ROADMAP.md](ROADMAP.md) — what is done, what is not, and what comes next.

## License

Private project — all rights reserved by the repository owner unless a license file is added.
