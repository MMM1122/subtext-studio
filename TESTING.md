# Testing

## Automated checks

```bash
npm run lint        # ESLint (next/core-web-vitals + typescript + react-hooks v7 rules)
npm run typecheck   # tsc --noEmit (strict)
npm test            # Vitest
npm run build       # Next.js production build
npm run check       # all four
```

### Unit & integration tests (Vitest)

Tests live in `src/tests/` and run real repositories against an in-memory IndexedDB (`fake-indexeddb`); each test gets a fresh database.

| Suite | Covers |
| --- | --- |
| `text.test.ts` | CJK + Latin counting, mixed punctuation; ProseMirror JSON → Markdown / plain text |
| `manuscript.test.ts` | Chapter create / reorder / duplicate / delete with cascade + unlink; autosave content; writing-session deltas; snapshot restore preserves current text as an automatic snapshot |
| `knowledge.test.ts` | Chapter-anchored history (carry-forward, later edits never alter earlier chapters); reader/character discrepancy detection; action-vs-knowledge warnings |
| `narrative.test.ts` | Independent chronological vs narrative reordering; causes-after-effects and cycle detection; dangling cause cleanup on delete; flashback / flash-forward classification; nonlinearity |
| `backup.test.ts` | Export → JSON → import round trip creates a new, fully re-keyed project with internally consistent references; invalid and future-schema backups rejected; duplicate & cascade delete; Markdown / text manuscript export; demo seeding is idempotent under concurrent calls |

**Result (this build):** 5 files, 24 tests, all passing (incl. demo-content consistency and demo upgrade seeding).

## End-to-end workflows (Playwright)

`e2e/workflows.py` drives a real Chrome against a running server and checks the ten required workflows. Requires Python 3 and `pip install playwright && playwright install chromium`.

```bash
npm run build && npm start &          # or npm run dev
BASE_URL=http://localhost:3000 python3 e2e/run.py e2e/workflows.py
```

| # | Workflow | Checks |
| --- | --- | --- |
| 1 | Create a project | dialog → project opens in Writing Studio |
| 2 | Write and edit multiple chapters | typing; **Chinese IME composition** simulated via Chrome DevTools `Input.imeSetComposition` (text inserted once, no stray pinyin); add chapter; *Saved locally*; find & replace all |
| 3 | Refresh and verify persistence | reload → last document reopens; chapter 1 text intact |
| 4 | Reorder chapters | keyboard drag (Space, ↓, Space); order persists after reload |
| 5 | Characters & relationships | create two characters; connect nodes on the graph; edit relationship type; persists after reload |
| 6 | Timeline events reordered independently | three events; move one in narrative order; chronological order unchanged; both persist |
| 7 | Knowledge across chapters | set Reader = known at ch1; ch2 shows "carried over"; set suspected at ch2; ch1 still known |
| 8 | Notes | capture two notes with tags; note search; project-wide search finds manuscript text |
| 9 | Export & restore | backup JSON (chapters + knowledge present); Markdown manuscript; import creates "(restored)" copy, original kept |
| 10 | Themes | System → Light → Dark toggles `html.dark` |

**Result (this build, production server, Chrome):** 21 / 21 checks passed, no console errors.

## Manual checks performed

- Visual review of every module in light and dark themes at 1440×900, and the Writing Studio at 390×844 (mobile).
- AI panel with no provider configured shows the unavailable notice; `/api/ai` returns `{configured:false}`; POST returns 503.
- Snapshot save / preview / restore; chapter deletion dialog lists dependent records.

## Not covered by automated tests

- A live AI provider round trip (no API key in the test environment).
- Safari / Firefox specifics (developed and tested in Chromium).
- Very large manuscripts (> 200k words) performance profiling.
