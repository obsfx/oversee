# oversee

This file contains the information and direction for the application we call `oversee`.

- **oversee** is a **diff viewer** and **line annotation** tool for **git repositories**.
- it displays the **diff** gathered with **git**, so it only works inside git repositories.
- it ships as a `go` **CLI** with an embedded browser **UI shell**:
    - **humans** review code in the UI shell.
    - **ai agents** use the CLI to pick up reviews, update their status and reply to comments.
    - in the end, our feedback flows between reviewers and agents through this app.

## architecture

```text
oversee serve (cwd = workspace, git root = repo)
  → listen on 127.0.0.1:6999 (or --port), fall back to an available port when it is busy
    → HTTP mux (localhost hosts only)
      → GET /        → embedded index.html.gz + injected window.__overseeGlobal
      → /api/*       → httpapi handler → service → git.Repository | repositories (sqlite)
      → GET /ws      → ws.Hub
        → service.EventFeed (PRAGMA data_version check every 100ms on the events table)
          → broadcast new events to every connected UI
    → service.WorkspaceWatcher (1s tick, see file watcher)
      → git fingerprint changed and settled → CommentService.Reconcile → comments.reconciled row
        → ws.Hub workspace.changed signal (never stored) → UI silently refreshes tree, diff, branches

oversee review start|close|reply (another process, usually an agent)
  → cli command → service.ReviewService
    → TxRunner.Within: domain rule → repositories write (status, reply, notification) → events row
      → the serve process event feed picks it up → websocket push → UI refreshes, bell count updates
```

##### go layers
```text
transport (httpapi, ws, cli)   decode input, map errors, render DTOs or presenters
  → service                    orchestrates: validate, read git, run transactions, append events
    → domain                   entities, value objects and rules as receiver methods. no IO, no json tags
    → repository               one struct per aggregate over sqlc queries, maps rows to domain, TxRunner
      → storage/sqlite         open, migrations, generated sqldb code, change detector
    → git                      Runner executes git, typed outputs parse it, Repository returns domain types
app                            composition root: workspace, db, repositories, services, http server
```
- dependencies point down only. `domain` imports nothing from the project.
- services declare the small interfaces they consume (`GitReader`, `Transactor`, `ChangeDetector`, `WorkspaceProbe`, `Audience`, `Reconciler`); repositories and the git repository are concrete structs.
- `git.Repository.Contents` returns `nil, nil` for a missing file (path not in the ref, deleted or a directory in the working tree) and an error for a failed read. code that makes one-way decisions (outdating comments) must only act on a missing file, never on an error.
- a comparison is **gone** when one of its refs no longer exists (`Comparison.Refs`: the source branch and the target, the target also for uncommitted comparisons). `git.Repository.Tree` checks them with `rev-parse --verify` first, `Contents` checks them only after a failed git read, and a missing ref returns `domain.ErrUnknownBranch`.
- every multi-write runs in `TxRunner.Within`, and its events are appended in the same transaction (outbox).
- the JSON contract lives only in `internal/transport/dto`: HTTP responses, CLI `--json`, event payloads (`dto.EventCodec`) and the websocket envelope. changing it means changing the UI parsers too.
- errors: `domain.ValidationError` maps to 400, `domain.ErrNotFound`/`ErrNoOpenSession`/`ErrUnknownBranch` to 404, session state conflicts and `ErrStaleContent` to 409, everything else to 500 and a log line.

- **HTTP** carries queries and commands. the **websocket** only pushes server events to the UI.
- every write appends a row to the `events` table in the same transaction. this lets CLI processes reach a running server without knowing its port, and lets a reconnecting UI replay missed events with `?after=<lastEventId>`.
- one exception is `workspace.changed`: a websocket envelope **without an id** that is never stored and never replayed. it only describes the files on disk right now, so a reconnecting UI refreshes everything instead of replaying it.
- settings writes are the other exception: they append no event. they are UI preferences with no CLI writer, so another open tab picks them up on its next load.
- `window.__overseeGlobal` holds `baseUrl`, `wsUrl` and `workspace` (folder `name`, `path`, and `repoName` when served from a repo subdirectory). without it (vite dev server, storybook), the UI falls back to `window.location` and `GET /api/workspace`.

## CLI interface

- `oversee init`: creates the `.oversee` directory inside the `cwd` and the `sqlite` database in it. it also adds `.oversee/` to `.git/info/exclude`, so it never shows up as an untracked change.
- `oversee serve`: serves the UI shell and the backend on the same address, port `6999` by default.
    - `--port`/`-p` sets the port. when the port (default or passed) can not be bound, serve falls back to an available port and prints `port N is unavailable, using port M`. `--port 0` picks any port.
    - `--open` opens the browser, `--dev` accepts websocket connections from local dev servers.
- `oversee review list`: lists finished review sessions, newest first, paginated with `--page` and `--limit`.
- `oversee review get <session-id>`: shows all details of a session: comments, saved code lines and replies. outdated comments are marked with `outdated since ...`, see **outdated comments**.
- `oversee review start <session-id>`: sets the session status to `in progress`.
- `oversee review close <session-id>`: sets the session status to `closed`.
- `oversee review reply <comment-id>`: when a comment is a question or not something to fix, the agent replies to it with `--body` or stdin. `--author` defaults to `agent`.
- every command accepts `-C <dir>` to run as if started in that directory. `list` and `get` accept `--json`.

## UI shell

Check the layout representation: `/Users/omercanbalandi/studio-2/oversee-visual-material/general-layout.png`. The sections in the image are color coded, so you can match them with the components below.

##### sidebar
- shows the **file tree**, powered by `@pierre/trees`. install its skill for a better understanding of the tool: `npx skills add https://github.com/pierrecomputer/pierre --skill trees`.
- **working principle**
    - on initial start, a non blocking API request is made to the backend.
    - the backend runs the necessary git commands to gather the file tree.
    - file items properly display the `MODIFIED`, `REMOVED` and `ADDED` markers.
    - file items can display additional custom icons on their left side. for example, a file marked as reviewed shows a green checkmark.
- the sidebar has a **resizable width**, with a handle on its right edge.
- the sidebar is **expandable/collapsible** with a toggle button in the **topbar**.
- selecting an item in the file tree shows that file in the **diff viewer**.
- shows a loader while the file tree is loading.
- the tree follows the files on disk without a reload, see **file watcher**.
- the toolbar `Reviewed` toggle and the tree context menu mark files reviewed. marks survive reloads and drop when the file changes, see **reviewed marks**.
- the sidebar toolbar has an `Unmark all reviewed` icon button (`UnmarkAllButton`) next to hide/show reviewed. it is disabled when nothing is reviewed and opens a compact confirm with a caret (`PopoverSurface caret`, title only `ConfirmPrompt`). confirming clears the current comparison's marks.

##### topbar
- a button that toggles the **sidebar**. it is an icon button that reflects the `expanded` or `collapsed` state with the proper icon.
- the **workspace breadcrumb**: the served folder name (`repo / folder` inside a subdirectory), then a slash, then the branch selection. the full path shows in a tooltip. the document title is `<folder> - oversee`.
- the **branch selection**: source and target branch, plus an option for viewing uncommitted changes.
    - the initial selection is `Uncommitted changes` against `main` (falling back to `master`, `develop`, then the current branch).
    - uncommitted changes always diff the working tree against `HEAD`. the target only matters for branch comparisons, where the diff runs from the merge base (or the target itself when the branches share no history).
    - the branch list follows git, see **file watcher**. when a selected source or target branch no longer exists (deleted, renamed, pruned), the selection switches by itself: a missing source becomes `Uncommitted changes`, a missing target becomes the default target. a warning bar between the topbar and the toolbar says what happened until it is dismissed or the next pick.
    - `ComparisonRules.replaceMissing` decides the switch, `BranchSelectionGuard` (part of `ReviewSync`) applies it on every branch list refresh and stores the notice in the comparison store, and `DeletedBranchNotice` (`WarningBar`) shows it. a selection the user never made just follows the default, without a notice.
- a `finish review` button, see **review sessions**.
- a **comments** button with a popover. it shows the comment count, see **review sessions**.
- a **notifications** button with a popover, see **notifications**.
- a settings button and its menu:
    - theme selection, light or dark.
    - font selection for the UI and the editor, powered by google fonts.
    - settings are saved in the workspace database, see **settings**.

##### toolbar
- file navigation: `[prevButton] {currentFileNumber} / {totalFileNumber} [nextButton]`, for example `[<] 4 / 72 [>]`.
- side-by-side and unified view toggle.
- total difference count of the file.
- `expand/collapse unchanged sections` button.

##### diff viewer
- powered by `@pierre/diffs`. install its skill for a better understanding of the tool: `npx skills add https://github.com/pierrecomputer/pierre --skill diffs`.
- shows `1 file at a time`.
- lines and line selections can be annotated. an annotation is sent to the backend and saved to the database.
- opening a file diff shows its comments, fetched from the backend. outdated comments are not drawn.
- shows a loader while the diff is loading. later refreshes from the **file watcher** are silent.
- shows a centered placeholder (`DiffPlaceholder`) instead of a blank area:
    - `No changes` when the comparison has no changed files, with `The working tree matches HEAD` or `<source> has no changes against <target>`.
    - `No content changes` when the selected file's diff has no hunks: `Renamed from <path>`, `Empty file added`, `Empty file deleted` or `Only file metadata changed` (mode changes).
    - `DiffPlaceholders.of` decides it, `useDiffPlaceholder` drives it. failed loads and binary files keep their own states.

## review sessions

##### purpose
- a **review session** is one round of review: the set of `comments` a reviewer left on a comparison (source branch vs target branch), frozen with the code they pointed at.
- the code changes after a review, so a finished session keeps its own copy of the commented lines. it never depends on the current diff to make sense.
- sessions are scoped to a **comparison**. switching the branch selection shows only that comparison's active comments and sessions.

##### lifecycle
- there is at most **one open session** per comparison. there is no explicit "start" action: the first comment on a comparison creates the open session.
- while the open session has comments, a `finish review` button sits left of the `comments` button in the **topbar**.
- `finish review` asks for confirmation first (anchored popover with the comment count), so an accidental click can not end the session.
- finishing closes the session: its comments leave the **diff view** and move to the session history. the next comment starts a new session.
- finished sessions are **never** put back into the diff view, because the lines may have moved or changed since.

##### statuses
- `created`: finished by the reviewer, nobody picked it up yet. every finished session starts here.
- `in progress`: someone is addressing the comments (`oversee review start`).
- `closed`: the comments are addressed and the review is done (`oversee review close`).
- status is **read-only** in the UI. agents change it through the CLI, the UI only displays it (leading status icon on each session row).

##### replies
- agents reply to comments with `oversee review reply`. replies show as an always visible thread under their comment in the session detail, rendered as full markdown (`MarkdownView`), so multi-paragraph answers stay intact. `CommentMarkdown` parses with `breaks: true` (like GitHub comments) in both the renderer and the editor, so a single newline from the CLI is a line break and edits round-trip it as `  \n`.

##### outdated comments
- an **outdated comment** is a comment of the **open (unfinished)** session whose saved lines can no longer be found in the current file, whose file left the comparison's change set, or whose comparison is gone (a source or target branch no longer exists).
- it is **one-way**: once outdated, a comment never becomes live again, even when the code comes back (`git stash pop`, undo).
- comments follow moved code: when the saved lines still exist somewhere else (lines added above), the comment is **re-anchored** to the new range and its snapshot line numbers move with it.
    - the stored position is checked first, then the nearest match. the earlier match wins a tie.
    - ranges that cross sides (a unified selection from deletions into additions) are never re-anchored, only checked in place.
    - a comment with an empty snapshot can not be located, so only the change set rule applies to it.
- outdated comments are **hidden from the diff**. the `Current` tab shows a notice row (`2 outdated comments`) that drills into an **Outdated** view: each comment with its saved code, `Open file` and `Delete`, plus `Delete all`.
- they stay in the session and move to Sessions on finish, and the finish confirmation says they keep their saved code. finished sessions are never reconciled, so the flag freezes there: the session detail shows an `outdated` label and dims the comment, `oversee review get` prints `outdated since ...`, and `--json` carries `outdatedAt` (`0` while live).
- **backend**
    - `comments.outdated_at`, added by migration `0002`.
    - the rules live in the domain: `Comment.Place` returns a `Placement` (unchanged, moved with the re-anchored comment, or outdated), `Blob.Lines` turns a file into lines, `LineRange.SnapshotSide` and `FileRef.SnapshotPath` pick the file a comment reads, and `FileTree.Find` and `WorkspaceChange.Touches` decide what to check.
    - `CommentService.Reconcile` checks only the live comments of open sessions that a change touches: every comment when refs moved, comments on changed paths for uncommitted comparisons.
    - it reads the end side of each file through `Change.File().SnapshotPath(range)`, so renamed files use their previous path on the old side. a comment whose file left the diff is outdated without reading it.
    - moves and outdated marks are written in one transaction, compare-and-set, with a `comments.reconciled` event only when rows changed. a read error skips that session until the next change, while `ErrUnknownBranch` outdates every live comment of the session. `CommentService.Create` returns it as a 404, so no session starts on a gone comparison.

##### stale comment check
- `POST /api/comments` takes `expectedLines` (the end-side lines the UI rendered for the range) and `previousPath`.
- the server compares `expectedLines` with the snapshot of the current file. a mismatch returns **409** (`domain.ErrStaleContent`), so a comment never attaches to code the reviewer did not see.
- an absent or `null` `expectedLines` (CLI, older clients) skips the check, and `[]` means "no lines expected" and is compared like any other value. the DTO keeps it as `*[]string` and the draft carries an explicit `VerifyLines` flag. files that can not be read skip the check too.
- in the UI, `CommentSnapshots.expectedLines` builds the lines with the server's snapshot rule, `HttpCommentGateway` turns the 409 into `StaleCommentError`, and the composer keeps the draft, refreshes the diff and asks the reviewer to check the lines and send again.

##### comments popover
- the topbar `comments` button opens a tabbed popover. its count and tooltip include outdated comments (`7 comments, 5 outdated`).
    - `Current`: comments of the open session. clicking one navigates to its file and scrolls to its line. outdated comments sit behind the notice row, see **outdated comments**.
    - `Sessions`: finished sessions of the current comparison, newest first. each row shows the status icon, finish date, branch and comment count.
- selecting a session drills into it inside the same popover (with a back button). each comment shows its file, line range, the saved code lines with **syntax highlighting** (same theme as the diff view), the full comment text as markdown and its replies. one-line rows (the `Current` tab) use `CommentMarkdown.summary` instead.

##### how it works
- `ReviewSessionGateway` (http, and in-memory for stories) and the `ReviewSessions` class own the data. finishing updates the session list and clears the active comments. `ReviewSessions.session(id)` loads a single session from any comparison.
- `useFinishReview`, `useReviewSessions`, `useReviewSession`, `useCommentsMenu` and `useSnippetHighlight` drive the UI. `SnippetHighlighter` tokenizes saved lines with the shared `@pierre/diffs` highlighter.
- `ReviewComment` carries `lines` (the saved snapshot) and `outdatedAt` (`null` while live). `CommentLists.live`/`outdated` split them, `CommentLabels` builds the count, notice, age and finish texts, and `useOutdatedComments`/`useOutdatedComment` drive the Outdated view.

## notifications

- agent actions (`review start`, `review close`, `review reply`) create **persisted** notifications with a read state, so things that happened while the UI was closed still show up.
- the topbar bell shows the unread count. its popover lists notifications newest first, with a `Mark all read` action.
- clicking a notification marks it read and drills into its review session inside the same popover, even when the session belongs to another comparison.
- `NotificationGateway` (http and in-memory) and the `Notifications` class own the data. `useNotifications` and `useNotificationsMenu` drive the UI.

##### server events
- `EventStream` is the push gateway: `SocketEventStream` in the app, `InMemoryEventStream` in stories.
- `ServerEvents` validates incoming envelopes at the boundary. `ServerEventSync` applies them to the services and is started by `ReviewSync`, see **review sync**.

##### review sync
- `ReviewLayout` mounts one hook, `useReviewSync`. it starts `ReviewSync` on mount and disposes it on unmount.
- `ReviewSync.start()` starts each reaction and returns one dispose that undoes them all:
    - `ServerEventSync`: event stream into the services.
    - `BranchSelectionGuard`: switches the comparison when a selected branch is gone, see **branch selection**.
    - `ReviewedMarksSync`: persists reviewed marks and prunes them against the current change set, see **reviewed marks**.
    - `NotificationBlink`: blinks the favicon when the unread count rises, unless reduced motion is preferred.
    - `DocumentTitleSync`: keeps `document.title` on `<folder> - oversee`.
- reactions subscribe to the zustand stores outside React (`AsyncResource.store`, and the app stores through the `ComparisonSelection`, `FollowedComparison` and `ReviewedMarksStore` ports that the hook builds), so they never re-render the layout and they act before React renders.
- event kinds: `session.finished`, `session.status`, `comment.replied`, `notification.created`, `notifications.read`, `comments.reconciled`. session events silently refresh the cached session lists, without showing a loader. `comments.reconciled {sessionId, comparison}` silently refreshes that comparison's comments.
- signals: `workspace.changed {paths, refs}` has no id and is never stored, see **file watcher**. `stream.resumed` is emitted by `SocketEventStream` itself when the socket reconnects.

## file watcher

- `oversee serve` keeps the UI in sync with the files on disk, so nobody reloads the page after editing a file or running git.
- **detection**: `WorkspaceWatcher` polls git instead of using OS file events. every tick builds a `WorkspaceFingerprint`:
    - `git --no-optional-locks status --porcelain=v2 -z --branch --no-ahead-behind --untracked-files=all`, plus `os.Stat` (size and mtime) of every listed path. status alone does not change when an already modified file is edited again.
    - `git for-each-ref` over `refs/heads` and `refs/remotes`, plus HEAD and the current branch.
    - `ChangesSince(previous)` returns the changed paths and whether any ref moved.
- **timing**: one tick per second. the first tick runs at startup and reconciles every open session. later ticks run only while a websocket client is connected.
- **settle rule**: a change is applied only when two ticks in a row agree and `.git/index.lock` does not exist, so a half-done checkout, stash or rebase is never acted on. the UI updates in 1-2s.
- on a settled change, `CommentService.Reconcile` runs first (see **outdated comments**), then the hub broadcasts `workspace.changed`.
- `.oversee/` is in `.git/info/exclude`, so database writes never look like a workspace change.
- several `serve` processes on one workspace are safe: each one reconciles, the writes are compare-and-set, and an event is appended only when rows changed.
- **UI side**: `ServerEventSync` hands the change to `WorkspaceRefresh`.
    - refs moved: invalidate the branch list, every change set and every cached file diff. the refreshed branch list drives the deleted branch switch, see **branch selection**.
    - otherwise: invalidate the uncommitted change sets and the cached diffs whose `path` or `previousPath` changed.
    - `AsyncResource.invalidate()` refreshes resources on screen (`useResource` registers them through `watch()`) without a loader, and marks the others stale so they refetch on their next view.
    - reviewed marks whose file got a new revision drop when the change set refreshes, see **reviewed marks**. when the selected file leaves the change set, the selection moves to the file now at its position.
    - an open comment composer keeps its draft across refreshes.
    - `HttpFileDiffGateway` puts a per-load revision into the `@pierre/diffs` `cacheKey`. with a fixed key, pierre keeps rendering the cached old contents after a refetch.
    - `stream.resumed` refreshes everything, because missed signals are not replayed.

## reviewed marks

- reviewed marks are UI state in `localStorage`, not the database, under `oversee.reviewed:<workspace path>`. localStorage is per origin, so marks saved under one port are not visible when serve falls back to another port.
- the stored value is `{ [comparisonKey]: { [path]: revision } }`. marks are scoped per comparison (`ComparisonRules.key`), like comments and sessions.
- a mark is valid only while the file's `revision` is unchanged. `/api/file-tree` returns a revision per change:
    - `git.Repository` reads `git diff --raw --no-abbrev -z -M` and builds `domain.RevisionOf(source, target)` (16 hex chars of sha256).
    - branch comparisons use the blob ids of both sides. uncommitted comparisons use the HEAD blob id and `Blob.Digest` of the working file. untracked files hash their content, deleted files keep the raw id.
    - so any content change drops the mark: a live edit, an edit while no tab was open, an agent that edits and commits within one watcher tick, a rebase. identical content keeps its revision, so touching a file or saving it unchanged keeps the mark.
- `ReviewedMarkRules` owns the rules (toggle, clear, prune, the current comparison's reviewed set). `useReviewStore` holds `marks`, the current `scope` (comparison key and revisions by path) and the derived `reviewed` set that the tree, the toolbar toggle and the sidebar read.

```text
ReviewedMarksSync.start
  → workspace ready → ReviewedMarksGateway.load → store.hydrate
    → store marks change → ReviewedMarksGateway.save
    → storage event from another tab → store.hydrate
  → selected comparison (or the default) → its change set resource
    → ready → store.focus(scope) → prune marks whose path left or revision changed
```

- `LocalReviewedMarksGateway` validates with valibot and falls back to `{}` on missing, invalid or blocked storage. writes ignore storage errors, so marks still work in memory. stories use `InMemoryReviewedMarksGateway` and seed marks with `seedReviewedMarks`.
- the file watcher needs no reviewed specific path: `workspace.changed` refreshes the change set, and the new revisions prune the marks.

## settings

- UI settings (theme, fonts, sizes, diff colors) live in the `settings` table of the workspace database (migration `0003`), one row per key with the JSON encoded value. each workspace keeps its own settings.
- the server stores values as they are and only checks the shape: a flat JSON object, at most 64 keys of 1 to 64 characters, values up to 4096 bytes. the UI owns the meaning of each key and validates with `SettingsSchema` (lenient, a default per field).
- `GET /api/settings` returns the stored object (`{}` when nothing is saved). `PATCH /api/settings` upserts only the keys it carries, so two tabs never overwrite each other's keys, and returns 204.

```text
main.tsx
  → SettingsSync.start(useSettingsStore)
    → HttpSettingsGateway.load: GET /api/settings → SettingsSchema → store.setState (defaults on failure)
  → render App

useSettingsStore.update(patch)
  → SettingsSync store subscriber, writes queued one at a time
    → changed keys against the last persisted values → PATCH /api/settings
      → success marks them persisted, failure leaves them for the next change
```

- `SettingsGateway` has http and in-memory versions. stories use the in-memory one and never start the sync.
- settings no longer use `localStorage`. values saved there before are ignored.

## development

- `pnpm dev:server`: runs the go server on port `4400` (falls back to another port when 4400 is busy, then the vite proxy can not reach it) against the test repository (`OVERSEE_DEV_REPO`, defaults to `/Users/omercanbalandi/oaks-lab/storyvine/now-api`). run `oversee init` there once.
- `pnpm dev`: runs vite. it proxies `/api` and `/ws` to the go server (`OVERSEE_DEV_API` overrides the target).
- `pnpm storybook`: storybook with in-memory gateways.
- `pnpm build:ui`: builds the UI shell into a single, gzipped `internal/webui/dist/index.html.gz` (vite `embed` mode, `vite-plugin-singlefile`, inlined diff worker).
- `pnpm build:cli`: `build:ui`, then builds `bin/oversee`.
- `../oversee-proto-backend` was the node mock backend of the first phase. the go server replaced it.

## distribution

- distributed over npm, like `esbuild`:
    - `@obsfx/oversee`: a small node shim (`npm/oversee/bin/oversee.js`) with every platform package as an `optionalDependency`.
    - `@obsfx/oversee-<os>-<arch>`: one go binary each, limited by `os` and `cpu`, so npm only installs the one for the current machine.
- platforms: `darwin`, `linux` and `win32` on `arm64` and `x64`, built with `CGO_ENABLED=0`.
- `pnpm build:npm <version>` writes every package into `npm-dist/`.
- `.github/workflows/release.yml` builds and publishes on `v*` tags. it needs the `NPM_TOKEN` secret.

## component development decision flow

- every major component design should be approved.
- we follow the **storybook first** principle. every component takes its place in storybook first.
- we create **alternatives for a component**. the **developer** reviews and picks one. then we implement it in storybook first, then put it into the app.
- alternatives are a throwaway interactive playground over a working page, in `./src/alternatives`, deleted after the pick.
- components should be **screen space efficient**. we go with a **compact** design for every part of the app and save space for the **diff viewer**, because that is the part where we actually read and review the code.

## how we design systems

##### frontend
- complexity should be placed in **class definitions**.
- if a class is only created once, use an **abstract class**.
- if a class can be injected somewhere, use a normal class.
- we never put logic and complexity in components. complexity is placed in custom hooks, and custom hooks orchestrate the necessary classes for the intended actions.
- side effects that react to service or store changes (syncing, document title, favicon) are lib classes with `start(): () => void`, composed by `ReviewSync` and mounted by one hook. components and layouts do not subscribe to state they do not render, and lib reaches app stores only through small ports declared by the class that uses them.
- when styling components with tailwind, use `/Users/omercanbalandi/studio-2/oversee/src/c.ts` for long or conditional class names.
- state management is `zustand`. stores live in `./src/store`.
- react contexts live in `./src/context/<name>/`, together with their provider and the hook that consumes them.
- prefer `interface` over `type` for object shapes.
- if https://usehooks.com/ (`@uidotdev/usehooks`) already provides a hook, use it instead of writing one from scratch.
- never add hard limits to lists to protect rendering performance. render everything and use virtual lists (`@tanstack/react-virtual`) when needed.
- never use unicode symbols such as `…`, `·`, `→` in source text. use plain text, or an icon from `react-icons` for symbols.
- use `plur` for count based pluralization.
- always use curly braces for `if` bodies and arrow function bodies.
- prefer plain `if` statements over multi-line ternaries and conditional spreads such as `...(x ? [a] : [])`. build the value, then add to it inside `if` blocks.
- in `./src/lib`, helper functions live in a class: private static methods of the class that uses them, or a small abstract utility class when shared (for example `ResponseGuards`). no module-level helper functions.
- use `dayjs` for date and time work.
- import from the project root with the `@/` alias, for example `@/src/primitives/kbd.tsx`. eslint rejects relative imports (`./`, `../`).
- validate external data (http responses, socket messages, injected globals, persisted settings) at the boundary, in the gateway or parser classes, with `valibot` schemas.
    - schemas are static members of those classes (`import * as v from 'valibot'`). shared building blocks live next to their owner (`LineRanges.schema`, `ChangeStatuses.schema`, `SessionStatuses.schema`, `ComparisonRules.wireSchema`, `CommentShapes.wire`) or in `ValueSchemas` for primitives such as `count`.
    - http gateways pass their body schema to `ApiClient.get`/`send`, which validate the response and throw `ApiError.unexpectedShape` on a mismatch. other strict values (the injected workspace) use `ApiClient.parse(schema, value, path)`. lenient parsers (notifications, server events, settings) use `v.safeParse` or `v.fallback` and drop or default bad values.
    - models stay declared `interface`s. a parser's return type checks the schema output, and wire-to-model differences (`outdatedAt` 0 to `null`, `source`/`target` to `comparison`) are `v.transform` steps.

##### go
- use the `use-modern-go` skill (`https://github.com/JetBrains/go-modern-guidelines`) before writing go code.
- use `encoding/json/v2`, the standard library `uuid` package and stdlib `net/http` routing with method patterns.
- keep the build `cgo` free: `modernc.org/sqlite` for sqlite, `github.com/coder/websocket` for websockets, `cobra` for the CLI.
- database access goes through `sqlc`: queries live in `internal/storage/sqlite/query`, generated code in `internal/storage/sqlite/sqldb` (committed, never edited). run `pnpm generate:sql` after changing queries or migrations.
- schema changes are new files in `internal/storage/sqlite/migrations`, tracked with `PRAGMA user_version`. never edit an existing migration, user databases already ran it.
- put logic in receiver methods on the type that owns it (domain entities, git output types, presenters), and orchestrate those calls in services.

##### workflow
- always use `trekker`. trekker is the source of our persistent work. create epics and tasks for each achievement.
- the `testing` phase is always a separate task or epic from the main tasks. always clean up and close open tasks and epics when they are completed.
- do not use `fallow` in this project.

## folder structure

##### frontend
- `./src/primitives`: tailwind styled components, no logic. tailwind class names can get long enough to fill the whole screen, so primitives hide them and keep component bodies clean.
- `./src/components`: components with logic that use `primitives`. for logic, follow the rules in **how we design systems**.
- `./src/lib`: class definitions. custom hooks use these classes to achieve the functionality.
- `./src/hooks`: custom hooks that handle component logic, using the classes in `./src/lib`.
- `./src/store`: zustand stores.
- `./src/layouts`: a layout consists of multiple components and defines an overall `page`.
- `./src/context`: react contexts, each in its own folder with its consumer hook and provider.
- `./src/stories`: every story lives here, mirroring the source folders (`primitives`, `components`, `layouts`). never place stories next to components. every primitive and component gets a story, so the project has a record of what exists.

##### go
- `./cmd/oversee`: the binary entry point, calls `transport/cli`.
- `./internal/app`: composition root, wires workspace, database, repositories, services and the http server.
- `./internal/domain`: entities, value objects, rules, domain events and errors.
- `./internal/service`: `DiffService`, `CommentService`, `ReviewService`, `NotificationService`, `SettingsService`, `EventFeed`, `WorkspaceWatcher`.
- `./internal/repository`: session, comment, reply, notification, settings and event repositories, `TxRunner`.
- `./internal/storage/sqlite`: database open, migrations, sqlc config, queries and generated `sqldb` code, change detector.
- `./internal/git`: git runner, output parsers and repository.
- `./internal/transport/httpapi`: http handlers per resource, error mapping, index page rendering, localhost guard.
- `./internal/transport/ws`: websocket hub.
- `./internal/transport/cli`: cobra commands (`init`, `serve`, `review`) and presenters.
- `./internal/transport/dto`: the JSON contract and its mappings.
- `./internal/workspace`: resolves the `.oversee` directory and the git root.
- `./internal/webui`: the embedded UI shell (`dist/index.html.gz`, built by `pnpm build:ui`).
- `./npm`, `./scripts`: npm shim and package build script.
