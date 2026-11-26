# Data model

All types are defined in [`src/types/index.ts`](src/types/index.ts). Every entity has a stable string `id` (UUID v4), `createdAt` and `updatedAt` (ms since epoch). Project-scoped entities carry `projectId`.

## Entities

| Entity (table) | Key fields | Notes |
| --- | --- | --- |
| **Project** (`projects`) | title, author, genre, synopsis, cover (data URL), archived, lastDocId, wordGoal, tracks[] | `tracks` are labels for parallel timelines. |
| **Chapter** (`chapters`) | order, title, status (`draft`/`revising`/`complete`), doc (ProseMirror JSON), text (cached plain text), wordCount, notes, wordGoal | `wordCount` = CJK characters + Latin words. |
| **Scene** (`scenes`) | chapterId, order, title, summary, doc, text, wordCount | Scenes are separate documents inside a chapter. |
| **Character** (`characters`) | name, role, color, appearance, background, personality, goals, motivations, fears, values, internalConflicts, externalConflicts, memories, beliefs, secrets, arc, notes, customFields[], position | `position` is the graph node position. |
| **CharacterRelationship** (`relationships`) | sourceId, targetId, type, direction (`forward`/`mutual`), description, strength (1–10 or null) | Strength is author-defined and optional. |
| **CharacterState** (`characterStates`) | characterId, chapterId, sceneId?, summary, emotionalState, variables[{name, value}] | Variables are free-form and author-defined; numeric values are charted. Not psychological measurements. |
| **StoryEvent** (`events`) | title, description, storyTime, chronoOrder, narrativeOrder, chapterId?, sceneId?, characterIds[], location, causeIds[], consequences, tags[], track, subjective{characterId → {order, note}} | Two independent order fields. |
| **StoryFact** (`facts`) | title, description, category (`fact`/`secret`/`clue`/`event`), order, eventId? | Rows of the Knowledge Matrix. |
| **KnowledgeState** (`knowledge`) | factId, agentId, chapterId, sceneId?, level (`unknown`/`known`/`suspected`/`misunderstood`), reason | Historical record; see below. `agentId` is a character id, `__reader__` or `__author__`. |
| **CharacterAction** (`actions`) | characterId, chapterId, factId, description, requires (`known`/`aware`/`unknown`) | Explicit actions used for consistency warnings. |
| **Foreshadowing** (`foreshadowing`) | description, introducedChapterId, expectedPayoffChapterId, actualPayoffChapterId, status, characterIds[], eventIds[] | |
| **ReaderExperienceMetric** (`metrics`) | chapterId, sceneId?, values{emotionalIntensity, tension, suspense, uncertainty, informationDensity, pacing: 0–10 or null}, source (`author`), note | Author estimates only. |
| **Note** (`notes`) | title, body, kind, tags[], pinned, chapterIds[], reference, convertedTo? | |
| **ManuscriptSnapshot** (`snapshots`) | docKind, docId, label, doc, text, wordCount, automatic | Full copies of a chapter/scene. |
| **WritingSession** (`sessions`) | date (local YYYY-MM-DD), wordsAdded, wordsRemoved | One row per project per day, from autosave deltas. |
| **UserSettings** (`settings`, id `"settings"`) | theme, editorFontSize, editorLineHeight, editorWidth, dailyWordGoal, aiConsent, demoSeeded | |

## Indexes (Dexie schema v1)

```
projects:        id, updatedAt, archived
chapters:        id, projectId, [projectId+order], updatedAt
scenes:          id, projectId, chapterId, [chapterId+order], updatedAt
characters:      id, projectId, name
relationships:   id, projectId, sourceId, targetId
characterStates: id, projectId, characterId, chapterId
events:          id, projectId, chapterId
facts:           id, projectId, [projectId+order]
knowledge:       id, projectId, factId, agentId, chapterId, [factId+agentId+chapterId]
actions:         id, projectId, characterId, chapterId, factId
foreshadowing:   id, projectId
metrics:         id, projectId, chapterId
notes:           id, projectId, pinned, updatedAt
snapshots:       id, projectId, docId, createdAt
sessions:        id, projectId, date, [projectId+date]
settings:        id
```

## Knowledge history semantics

A `KnowledgeState` row means: *from chapter C onward, agent A holds level L about fact F* — until a later record supersedes it.

- The effective state at chapter position *p* is the record for (F, A) with the greatest chapter position ≤ *p* (ties broken by `updatedAt`). With no such record the state is `unknown`.
- Setting a cell while viewing chapter *p* **upserts only the record anchored to chapter *p*** (unique by `[factId+agentId+chapterId]`). Records for other chapters are never modified, so changing chapter 3 never changes what chapter 1 shows.
- "Remove change at this chapter" deletes that one record, so the cell inherits from earlier chapters again.
- Records whose chapter was deleted are removed with the chapter (the user is told how many in the confirmation dialog).
- Chapter *order* defines the timeline of knowledge, so reordering chapters reorders history accordingly.

## Deletion rules

| Deleting | Deletes | Unlinks (keeps) |
| --- | --- | --- |
| Project | everything with that `projectId` (one transaction) | — |
| Chapter | its scenes, snapshots (chapter + scenes), knowledge records, character states, metrics, actions anchored to it | events' `chapterId/sceneId`, notes' `chapterIds`, foreshadowing chapter fields; `lastDocId` falls back |
| Scene | its snapshots | references in events, knowledge, states, metrics |
| Character | relationships, states, knowledge records, actions | from events' `characterIds`/`subjective`, foreshadowing |
| Event | — | from other events' `causeIds`, facts' `eventId`, foreshadowing; orders renumbered |
| Fact | its knowledge records and actions | — |

All destructive actions require confirmation in the UI.

## Migrations & versioning

- `SCHEMA_VERSION` (in `lib/database/db.ts`) is written into every backup.
- IndexedDB migrations: add `this.version(n).stores({...}).upgrade(tx => ...)` — never edit a released version.
- Backup migrations: `migrateBackup()` in `lib/validation/backup.ts` upgrades older payloads; backups from a newer schema are rejected with a clear message.

## Backup format

```jsonc
{
  "format": "subtext-studio/project",
  "schemaVersion": 1,
  "exportedAt": "2026-11-26T08:00:00.000Z",
  "app": "Subtext Studio",
  "project": { ... },
  "chapters": [...], "scenes": [...], "characters": [...], "relationships": [...],
  "characterStates": [...], "events": [...], "facts": [...], "knowledge": [...],
  "actions": [...], "foreshadowing": [...], "metrics": [...], "notes": [...],
  "snapshots": [...], "sessions": [...]
}
```

Import pipeline: JSON parse → `migrateBackup` → zod validation (`backupSchema`) → `remapBackup` (fresh ids for every entity, references rewritten, dangling references cleared, orphaned required-parent records dropped and counted) → single-transaction insert as a new project. A library export (`subtext-studio/library`) is an array of these documents.
