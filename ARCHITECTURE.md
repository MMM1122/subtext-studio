# Architecture

Subtext Studio is a **local-first single-page application** delivered by Next.js. All authoring data lives in the browser (IndexedDB). The only server code is an optional, stateless AI proxy route.

```
┌────────────────────────── Browser ───────────────────────────┐
│  app/ (routes, thin)                                          │
│    └─ components/<module>/*  (UI, per feature)                │
│         ├─ hooks/data.ts  ── useLiveQuery ──┐  (reactive reads)│
│         ├─ stores/ (Zustand: UI + editor bridge)               │
│         └─ lib/repositories/* ──────────────┤  (all writes)    │
│               features/*/logic.ts (pure domain rules)          │
│                                             ▼                  │
│                     lib/database/db.ts  (Dexie → IndexedDB)    │
│  lib/export/*  (backup, manuscript, download)                  │
│  lib/validation/backup.ts (zod schemas + migrations)           │
└──────────────────────────────┬────────────────────────────────┘
                               │ only on explicit, consented request
                ┌──────────────▼──────────────┐
                │ app/api/ai/route.ts (Node)  │──► Anthropic / OpenAI-compatible
                │ lib/ai/providers.ts (server-only)                       │
                └─────────────────────────────┘
```

## Technology choices

| Technology | Why |
| --- | --- |
| **Next.js 16 (App Router)** | File-based routing for the module URLs (`/projects/[id]/write`, …), zero-config Vercel deployment, a place for a server-only AI route, Turbopack builds. Pages are client components because all data is local. |
| **React 19 + TypeScript (strict)** | Typed domain model shared by UI, persistence, validation and tests. |
| **Tailwind CSS 4** | Design tokens (the specified light/dark palettes, serif/sans stacks) are CSS variables mapped into Tailwind via `@theme`, so themes switch by toggling one class. |
| **shadcn/ui-style primitives** (`components/ui`) built on **Radix** Dialog & Dropdown Menu | Accessible focus management and keyboard support without a heavy component library; styled to the quiet literary aesthetic. |
| **Lucide** | Consistent, light icon set. |
| **Tiptap 3 (ProseMirror)** | Robust rich text, correct IME/composition handling for Chinese input, undo history, extensibility (custom find/replace plugin with decorations). Content is stored as ProseMirror JSON. |
| **Dexie 4 (IndexedDB)** | Large local storage quota, transactions, compound indexes, schema versioning, and `useLiveQuery` for reactive UIs. |
| **Zustand** | Small UI-only state (sidebar/inspector/focus mode, save status, toasts, the active editor bridge). Domain data is *not* duplicated in Zustand — IndexedDB is the single source of truth. |
| **React Flow (@xyflow/react 13)** | Pan/zoom node graph for character relationships; custom nodes and a custom "floating" edge that connects node borders. |
| **dnd-kit** | Accessible drag-and-drop (pointer + keyboard) for chapters, scenes, both timelines and subjective time — each list has its own DnD context so axes never interfere. |
| **Recharts** | Simple SVG charts (experience curve, character variables, writing stats); lazy-loaded. |
| **zod** | Validation of imported backups and AI requests. |
| **Vitest + fake-indexeddb** | Fast tests that exercise real repositories against an in-memory IndexedDB. |

## Directory layout

```
src/
  app/                       routes only (library, settings, projects/[projectId]/<module>, api/ai)
  components/
    layout/                  AppProviders, ProjectShell (top bar, sidebar, inspector), Settings, theme
    editor/                  WritingStudio, Binder, ManuscriptEditor, toolbar, find/replace, inspector, AI panel
    characters/ timeline/ knowledge/ reader/ notes/ library/ analytics/
    ui/                      button, field (incl. IME-safe BufferedInput), dialog, menu, misc
  features/<area>/           pure, testable domain logic (knowledge resolution, causality, foreshadowing checks, search plugin)
  lib/
    database/                Dexie schema & migrations, demo content, seeding
    repositories/            all write operations, cascade/unlink rules, factories
    export/                  backup export/import/remap, manuscript (md/txt), downloads
    validation/              zod backup schema + migrateBackup()
    ai/                      task definitions, prompts, server-only providers
    utils/                   ids, text counting (CJK + Latin), rich-doc conversion
  stores/                    Zustand stores
  hooks/                     reactive data hooks
  tests/                     Vitest suites
  types/                     domain types
```

## How modules communicate

- **Reads** are reactive: components call hooks in `hooks/data.ts` (`useChapters`, `useKnowledge`, …) which wrap Dexie `useLiveQuery`. Any write anywhere (another module, another tab) re-renders dependents.
- **Writes** always go through `lib/repositories/*`. Repositories own invariants: timestamps, ordering, cascade deletes, and unlinking references (e.g. deleting a chapter clears `event.chapterId` but deletes knowledge records anchored to it). Multi-table operations run in a single Dexie transaction.
- **Domain rules** live in `features/*/logic.ts` as pure functions (`resolveCell`, `findDiscrepancies`, `checkActions`, `checkCausality`, `narrativeMarkers`, `checkForeshadowing`). UI renders their results; they never mutate data.
- **Cross-module links** are by id: events ↔ chapters/scenes/characters/causes, facts ↔ events, knowledge ↔ facts/agents/chapters, foreshadowing ↔ chapters/characters/events, notes ↔ chapters and conversion targets.
- The **editor bridge** (`stores/editor.ts`) exposes the active Tiptap editor and a `flush()` function so the inspector (snapshots, AI revision) can save pending text before acting.

## Persistence & integrity

- **Autosave:** editor changes mark the document dirty; a 700 ms debounce saves ProseMirror JSON + cached plain text + counts. Pending changes are flushed on document switch, unmount, `visibilitychange`, `pagehide`/`beforeunload`, and `Ctrl/⌘+S`. The status indicator shows *Unsaved → Saving → Saved locally* (or *Save failed*).
- **No silent overwrites:** the editor loads a document once per mount and never re-applies database content while you type. Restoring a snapshot or applying an AI revision first stores the current text as an automatic snapshot.
- **IME safety:** the Tiptap editor handles composition natively. All other persisted text fields use `BufferedInput`, which keeps a local draft while focused and during composition, then commits on debounce/blur — avoiding cursor jumps and broken composition caused by async round-trips.
- **History semantics** (Knowledge Matrix): see DATA_MODEL.md.
- **Import:** validate (zod) → migrate → re-key all ids → insert as a new project in one transaction.

## Performance

Heavy modules (editor, React Flow, Recharts, AI panel) are loaded with `next/dynamic` and `ssr:false`. Editor toolbar state uses `useEditorState` selectors to avoid re-rendering on each keystroke; save status updates don't re-render the editor. Chart animations are disabled. Counting runs on save, not on every keystroke.

## Security & privacy

- No analytics, telemetry, fonts or other third-party requests at runtime (system font stacks are used).
- API keys are read only in `lib/ai/providers.ts` (`import "server-only"`); the client receives `{configured, provider, model}` only.
- AI requests require `consent: true`, are size-limited and validated, and the response is displayed as a suggestion — never auto-applied.
- Basic security headers are set in `next.config.ts`.

## Extending

- **Supabase / cloud sync:** repositories are the only write path; a sync layer can wrap them or replicate Dexie tables. The backup format is already a portable project document.
- **New AI providers:** implement `AIProvider` in `lib/ai/providers.ts`.
- **Schema changes:** add `this.version(n)` in `db.ts` and a case in `migrateBackup()`; bump `SCHEMA_VERSION`.
