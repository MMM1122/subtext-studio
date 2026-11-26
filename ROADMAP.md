# Roadmap

Status as of the first release (v0.1). "Done" means implemented, wired to persistence and exercised by tests or the end-to-end run.

## P0 — required MVP

| Feature | Status |
| --- | --- |
| Application layout, navigation, collapsible sidebar & inspector, focus mode | ✅ Done |
| Light & dark themes (+ system) without flash | ✅ Done |
| Project library (create, edit, duplicate, archive, delete, cover, counts, recent activity, continue writing) | ✅ Done |
| Chapter management (create, rename, reorder, duplicate, delete, status) + scenes | ✅ Done |
| Rich-text editor, undo/redo, find & replace, CJK + English counts, goals, chapter notes | ✅ Done |
| Persistent debounced autosave with indicator | ✅ Done |
| Character profiles (all specified fields + custom fields) | ✅ Done |
| Character relationship graph (type, direction, description, optional strength; persisted positions) | ✅ Done |
| Dual narrative timeline with independent ordering, cross-highlighting, flashback/flash-forward, tracks | ✅ Done |
| Chapter-based Knowledge Matrix with historical records, reasons, filters, gap analysis | ✅ Done |
| Idea Vault (capture, tags, search, pin, chapter links, convert) | ✅ Done |
| Manuscript export (Markdown, plain text) | ✅ Done |
| Full project backup & validated, non-destructive restore | ✅ Done |

## P1

| Feature | Status |
| --- | --- |
| Character state history (author-defined variables + chart) | ✅ Done |
| Foreshadowing tracker with checks and span view | ✅ Done |
| Reader experience charts (clearly labelled author estimates) | ✅ Done |
| Version snapshots with safe restore | ✅ Done |
| Writing statistics (daily words, 14-day chart, goals) | ✅ Done |
| Advanced search (project-wide full text) | ✅ Done (substring search; no ranking/fuzzy matching) |
| Optional AI integration (provider interface, consent, suggestions, approve-to-apply revision) | ✅ Done — requires a server API key; untested against a live provider in this build because no key was configured |
| Subjective character time | ✅ Done |
| Action vs knowledge consistency warnings | ✅ Done |

## Known limitations

- **Single device.** Data lives in one browser's IndexedDB; there is no sync. Use backups to move between devices.
- **Scene-level metrics/knowledge.** The data model supports `sceneId` on knowledge states, character states and metrics, but the UI records them per chapter.
- **Find & replace** works within the current document (not project-wide replace).
- **Relationship graph** has no automatic layout; positions are manual.
- **Event position numbers** in the inspector are global even when a track filter is active.
- **AI** responses are not streamed; long requests show a waiting state (90 s timeout).
- **Mobile**: usable for reading and light editing; drag-and-drop and the graph are designed for desktop.
- Covers are stored as compressed data URLs inside IndexedDB/backups.

## P2 — future

- Branching narrative sandbox ("what if" copies of chapters with diff/merge)
- Story simulation from the knowledge matrix (who could infer what, when)
- Experimental reader studies (opt-in, consented, separate from authoring data)
- Real-time collaboration and cloud sync (e.g. Supabase; repositories are already the single write path)
- Advanced semantic manuscript analysis (only with explicit consent; clearly labelled)
- Publishing integrations; DOCX, PDF and EPUB export
- Scene-level knowledge and metrics UI; project-wide replace; graph auto-layout
- Research instrumentation for time perception, theory of mind, memory and event segmentation studies

## Recommended next priorities

1. Cloud backup option (encrypted, opt-in) to remove the single-browser risk.
2. Scene-level Knowledge Matrix and Reader Lab rows.
3. DOCX/EPUB export.
4. Streaming AI responses and per-task context selection (e.g. include the knowledge matrix for consistency review).
5. Playwright suite in CI on every push.
