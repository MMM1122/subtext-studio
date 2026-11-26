# User guide

Subtext Studio keeps your novel — and the structure beneath it — in one place. Everything is saved automatically in this browser. **Export a backup regularly** (project menu → *Export backup*).

## Library

- **New project** — title, author, genre, synopsis, optional cover image and a manuscript goal.
- Each card shows word count (Chinese characters + English words), chapters, goal progress and last activity. **Continue writing →** opens the last document you edited.
- Card menu (**⋯**): edit details, duplicate, export backup (.json), export manuscript (.md / .txt), archive / restore, delete (type `DELETE` to confirm; you're offered a backup first).
- **Import backup** accepts a project backup or a whole-library export. Imports always create *new* projects; nothing existing is overwritten.
- **Recent activity** lists the latest edited chapters/scenes across projects.
- A demonstration project, *灯下时刻 · The Lantern Hours* (original fictional content), is added on first launch. You can add it again from Settings.

## Workspace layout

- **Left navigation** — modules. Collapse with the ⧉ button or `Ctrl/⌘ + \`.
- **Right inspector** — context for whatever is selected. Toggle with `Ctrl/⌘ + .`.
- **Top bar** — breadcrumb, save status, focus mode, export menu, theme.
- **Theme** — the sun/moon/monitor button cycles Light → Dark → System. Font size, line height and page width are in Settings.

## Writing Studio

- **Manuscript list** — `+` adds a chapter. Drag the ⠿ handle (or focus it and use Space + ↑/↓ + Space) to reorder. Double-click a title to rename. The **⋯** menu adds scenes, duplicates, sets status (Draft / Revising / Complete) or deletes (the dialog lists everything that will be affected).
- **Scenes** are separate documents inside a chapter; expand a chapter with ▸ to see and reorder them.
- **Editor** — bold, italic, strikethrough, headings, quotes, lists and scene breaks (⁂). Undo/redo with `Ctrl/⌘+Z` / `Ctrl/⌘+Shift+Z`.
- **Autosave** — about 0.7 s after you stop typing; the top bar shows *Unsaved changes → Saving… → Saved locally*. `Ctrl/⌘+S` saves immediately. Switching documents or closing the tab also saves.
- **Find & replace** — `Ctrl/⌘+F`. Enter / Shift+Enter move between matches; *Replace all* is a single undoable step.
- **Counts** (footer) — total, 字 (CJK characters), English words, characters without spaces, and chapter-goal progress.
- **Focus mode** — `Ctrl/⌘+Shift+F` or the ⤢ button hides everything but the page. `Esc` exits.
- **Inspector → Details** — status, chapter goal, chapter notes, scene summary, and timeline events linked to this chapter.
- **Inspector → Versions** — save a labelled snapshot; preview, restore (your current text is first saved as an automatic snapshot) or delete snapshots.
- **Inspector → Stats** — manuscript total vs goal, today's words vs daily goal, a 14-day chart and per-chapter lengths.
- **Inspector → AI** — see *AI assistant* below.

## Character Lab

- **Cast list** — `+` adds a character. Roles set a default muted colour; you can pick another.
- **Profile** — appearance, background, personality, goals, motivations, fears, values, internal/external conflicts, memories, beliefs, secrets, arc, notes, plus any **custom fields** you define.
- **Relationship graph** — drag nodes to arrange (positions are saved). Drag from one node's handle to another to create a relationship, then set its type, one-way or mutual direction, description and an optional strength (1–10). Click a line to edit or delete it. Nodes are never deleted by keyboard accidents; delete a character from the inspector.
- **State history** — add a snapshot at any chapter: summary, emotional state and your own variables (e.g. “trust in Iris = 6”). Numeric variables are charted across chapters. These are creative notes, not psychological measurements.

## Narrative Lab

- **Dual timeline** — the left column is *chronological time* (when events happen in the story world); the right is *narrative order* (when readers encounter them). Drag within a column to reorder **only that axis**. Curves connect each event across the two; hovering or selecting highlights it on both sides.
- Labels **flashback** / **flash-forward** and the **nonlinearity** percentage are computed from your two orderings.
- **Tracks** — assign events to parallel timelines (e.g. *Present*, *1998*) and filter by track.
- **Inspector** — title, description, story time, location, track, chapter/scene, characters, causes ("caused by"), consequences, tags.
- **Subjective time** — pick a character to order the events they're involved in by how *they* experience or remember them, with a note per event. Optional and independent of the other orders.
- **Causality** — warnings for causes that happen after their effects, circular causality, missing causes, and narrative order that disagrees with chapter assignment. Effects shown before their causes are listed as information (a reveal structure). Nothing is ever changed automatically.

## Knowledge Matrix

- **Rows** are story facts, secrets, clues or events; **columns** are characters, the **Reader** and the **Author**. Hide columns with the chips above the table.
- **As of chapter** — choose the chapter you're looking at. Click a cell to cycle Unknown → Known → Suspected → Misunderstood *at this chapter*. Right-click (or use the inspector) to choose a state directly and record **why** the agent believes it.
- Faded cells are **carried over** from an earlier chapter; a small dot marks cells changed in the current chapter. Changing chapter 3 never changes chapter 1.
- **Inspector history** shows every recorded change for the cell; click an entry to jump to that chapter. *Remove change at this chapter* restores inheritance.
- **Gaps** below the table: *dramatic irony* (reader knows, character doesn't), *reader in the dark* (character knows, reader doesn't), *misbelief*. Gap cells are tinted when highlighting is on.
- **Disclosure over time** — one agent (Reader by default) across all chapters: when does each truth surface?
- **Action checks** — record things characters *do* that presuppose knowledge (e.g. “pretends not to recognise Lin” requires knowing). You'll get a warning when your recorded knowledge state at that chapter disagrees. These checks use only what you recorded; the app does not analyse manuscript text.
- Filter by text and by state; add facts with the field under the table.

## Reader Lab

- **Experience curve** — enter your intended values (0–10) per chapter for emotional intensity, narrative tension, suspense, uncertainty, information density and pacing; toggle lines on the chart. These are **author estimates, not measured reader data**.
- **Foreshadowing** — threads with introduced / expected payoff / actual payoff chapters, status (planned, planted, reinforced, paid off, abandoned), linked characters and events. The span chart shows each thread across the book; warnings flag payoffs before introductions, completed chapters missing an expected payoff, and status mismatches.

## Idea Vault

- **Quick capture** — type and press *Capture* (or `Ctrl/⌘+Enter`). With several lines, the first becomes the title. Choose a type: idea, dialogue, research, question, visual reference, alternative plot. Add tags.
- Search, filter by type and tag; pinned notes stay on top.
- **Inspector** — edit, pin, link to chapters, add a reference URL, and **convert** a note into a character, timeline event or scene (the note is kept and marked as converted).
- **Search whole project** — full-text search across chapters, scenes, characters, events, facts and notes, entirely local.

## AI assistant (optional)

- Only available when the deployment has a provider configured (see README). Otherwise the panel says so and everything else works normally.
- First use asks for **explicit consent**. You can revoke it in Settings.
- Choose a task (brainstorm, motivation analysis, consistency review, alternative plots, foreshadowing analysis, dialogue feedback, revise selection, style feedback). The panel tells you exactly what will be sent (the selection or the current document, optionally with synopsis + character list).
- Results appear as a **suggestion, separate from your text**. Copy it, save it to the Idea Vault, or — for *Revise selected passage* — open a side-by-side comparison and explicitly replace the selection. A snapshot of the original is saved first.

## Settings

Theme, editor typography with live preview, daily goal, storage usage and *Request persistent storage*, *Export all projects*, add demo project, AI status/consent, keyboard shortcuts.
