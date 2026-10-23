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
    → HTTP mux (localhost hosts only, http.CrossOriginProtection, sameOrigin on GET /api/definitions, /api/file-content and /api/change-flow)
      → GET /        → embedded index.html.gz + injected window.__overseeGlobal
      → /api/*       → httpapi handler → service → git.Repository | repositories (sqlite)
      → GET /ws      → ws.Hub
        → service.EventFeed (PRAGMA data_version check every 100ms on the events table)
          → broadcast new events to every connected UI
    → service.WorkspaceWatcher (1s tick, see file watcher)
      → git fingerprint changed and settled → CommentService.Reconcile → comments.reconciled row
        → ws.Hub workspace.changed signal (never stored) → UI silently refreshes tree, diff, branches
    → service.LanguageServerService (see language servers)
      → install jobs → ws.Hub language-servers.changed signal (never stored)
    → service.ChangeFlowService (see change flow)
      → running builds → ws.Hub change-flow.progress signal (never stored), at most every 250ms per comparison

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
    → langserver               app home, platform, toolchain, installer, installations and processes of language servers
    → lsp                      JSON-RPC over a process transport, LSP client, session pool
      → lsp/lsptest            test helpers only: PipeTransport over net.Pipe, Connect, Frame, WriteFrame, ReadFrame. imports nothing from the project, so lsp's own tests use it too
    → catalog                  the embedded language server catalog, plain data with validation
    → gdscript                 GDScript syntax facts (generated tree-sitter grammar through bonsai), Godot project model, call resolution
app                            composition root: workspace, db, repositories, services, http server
```
- dependencies point down only. `domain` imports nothing from the project.
- services declare the small interfaces they consume (`GitReader`, `Transactor`, `ChangeDetector`, `WorkspaceProbe`, `Audience`, `Reconciler`, `WorkspaceListener`, `ServerInstaller`, `InstallationStore`, `RequirementProbe`, `InstallationFinder`, `ServerLauncher`, `ProjectPaths`, `ProjectFiles`, `SessionSource`, `SessionPool`, `SessionStopper`, `DefinitionGit`, `FlowGit`, `GodotAnalyzer`); repositories, the git repository and the langserver and lsp types are concrete structs.
- `git.Repository.Contents` returns `nil, nil` for a missing file (path not in the ref, deleted or a directory in the working tree) and an error for a failed read. code that makes one-way decisions (outdating comments) must only act on a missing file, never on an error.
- a comparison is **gone** when one of its refs no longer exists (`Comparison.Refs`: the source branch and the target, the target also for uncommitted comparisons). `git.Repository.Tree` checks them with `rev-parse --verify` first, `Contents` checks them only after a failed git read, and a missing ref returns `domain.ErrUnknownBranch`.
- repo paths (diff, comments, definitions, file content) share one rule, `repoPathProblem`: required, not starting with `-`, and inside the repository.
- every multi-write runs in `TxRunner.Within`, and its events are appended in the same transaction (outbox).
- the JSON contract lives only in `internal/transport/dto`: HTTP responses, CLI `--json`, event payloads (`dto.EventCodec`) and the websocket envelope. changing it means changing the UI parsers too.
- errors: `domain.ValidationError` maps to 400, `domain.ErrNotFound`/`ErrNoOpenSession`/`ErrUnknownBranch` to 404, session state conflicts, `ErrStaleContent`, `ErrLanguageServerUnavailable` and `ErrLanguageServerBusy` to 409, everything else to 500 and a log line.

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
- `oversee licenses`: prints the license and version of the third-party code compiled into the GDScript parser (tree-sitter, tree-sitter-gdscript, bonsai), so their MIT notices ship with the binary.
- every command accepts `-C <dir>` to run as if started in that directory. `list` and `get` accept `--json`.

## UI shell

Check the layout representation: `/Users/omercanbalandi/studio-2/oversee-visual-material/general-layout.png`. The sections in the image are color coded, so you can match them with the components below.

##### sidebar
- the sidebar header (`SidebarHeader`) shows the current mode as a title button (`SidebarModeMenu`: `SidebarTitleButton` with `SidebarModeIcon`, the label and a chevron). it opens a Base UI `Menu` (`MenuPopupSurface`, popover motion) with one `MenuRadioOption` per mode (`Changed files`, `Call flow`, texts from `SidebarModes`). `Files` shows `FilesPanel` (the file tree below), `Flow` shows `FlowPanel`, see **flow mode**. switching has no animation. the mode is kept in `useLayoutStore` next to `sidebarExpanded` and persisted in localStorage (`oversee.layout`), validated by `SidebarModes.parse` (falls back to `Files`). only the active panel is mounted, so the flow panel never fetches change flows in Files mode. the panels' view state (hide reviewed, both filters, collapsed folders, collapsed and opened call rows, the last revealed file) lives in `useSidebarViewStore` (not persisted), so it survives mode switches and a collapsed sidebar.
- shows the **file tree** with our own rows (no tree library), the same row primitives as the call stack tree: `TreeRow` (a whole pixel `--tree-row-height` from `TreeMetrics.rowHeight(uiScale)`, written by `DocumentAppearance` and used as the virtualizer estimate; padding, guides and elbows scale in rem), `TreeGuides`, `TreeTwisty`, `FolderRow`, `FileRow`.
- **working principle**
    - on initial start, a non blocking API request is made to the backend.
    - the backend runs the necessary git commands to gather the file tree.
    - `FileTreeRows` builds the rows from the change set: folders first, then files, by name. a folder that only holds one folder is compressed into one row (`src/components`). `FileTreeRows.files` uses the same order, so the toolbar's previous and next follow the tree.
    - a file row shows the reviewed check in the twisty column (`ReviewedMark`), its brand logo (`FileKindIcon`, kind from `FileKinds`) in the language's own color (`--color-kind-*` per theme), the name tinted with its git status (`--color-status-*`, deleted also struck through, untracked italic, dimmed while reviewed) and `+additions -deletions` (`LineCounts`, in the added and removed status colors, a zero stays muted). the status is also in the row title, and the row's accessible name is `FileTreeLabels.rowLabel` (`staging.yml, Deleted, 0 lines added, 42 removed`). folders show `FolderIcon` (a soft tinted, outlined body and a solid darker tab from `--color-folder`, `folder-edge` and `folder-tab`) and no git marker.
- the rows are virtualized (`@tanstack/react-virtual`, `useFileTree`), keyboard driven (arrows, Home, End, Enter, Space; the tree is one focusable `tree` with `aria-activedescendant` while the active row is rendered, rows carry `aria-posinset` and `aria-setsize`) and follow the navigation selection: a selected file expands its folders once (`revealFile`, also for a file picked while the panel was not mounted) and scrolls into view. arrows on a hidden active row (collapsed, filtered, hide reviewed) start from its nearest visible ancestor.
- both trees share `useTreeController` (the filtering guard, toggle, `Expand all` and `Collapse all`, `TreeKeys.allExpanded`, and the keyboard through the pure `TreeKeys.command`), `useTreeVirtualizer` (scrolls only when the active row changes, built on `useListVirtualizer`, which the combobox lists use too) and the toolbar `ExpandAllButton`. each tree passes its own focus rule (file tree arrows open files, flow arrows only move the active row), open, toggle and collapse-all keys.
- the filter matches paths and shows the matching files with their folders open. while it is active, folders can not be collapsed and `Expand all` is disabled. when the filter or hide reviewed leaves no rows, the panel says so (`FileTreeLabels.noRows`).
- `Mark as reviewed` lives in a context menu (Base UI `ContextMenu`) on file rows. the menu resolves its row when it opens (the row under the pointer, or the active row for the menu key) and does not open on folders or empty space.
- the sidebar has a **resizable width**, with a handle on its right edge.
- the sidebar is **expandable/collapsible** with a toggle button in the **topbar**.
- selecting an item in the file tree shows that file in the **diff viewer**.
- shows a loader while the file tree is loading.
- the tree follows the files on disk without a reload, see **file watcher**.
- the toolbar `Reviewed` toggle and the tree context menu mark files reviewed. marks survive reloads and drop when the file changes, see **reviewed marks**.
- the sidebar toolbar has an `Unmark all reviewed` icon button (`UnmarkAllButton`) next to hide/show reviewed. it is disabled when nothing is reviewed and opens a compact confirm with a caret (`PopoverSurface caret`, title only `ConfirmPrompt`). confirming clears the current comparison's marks.

##### flow mode
- a top to bottom **call stack tree** of the changed functions of the comparison, so a reviewer can read a change in call order. the data comes from `GET /api/change-flow`, see **change flow** under **language servers**.

```text
FlowPanel (useFlowPanel)
  → useCallFlow (useComparisonResource): ChangeFlows.get(comparison) → ready {servers, graph} | loading | failed
  → useFlowServerNotices: FlowServerNotices.of(flow, language server list, install failures) → isPending, actionsOf → FlowServerLabels
  → useCallFlowTree
    → CallFlowLayouts.of(graph): index and entry points (CallFlowGraphSearch closure and cycle components), memoized per graph
      → CallFlowOpenWalks.of(graph, layout, query): first keys, expandable keys, matches, memoized per query
        → CallFlowRows.of(graph, layout, openWalk, {collapsed, opened}) → CallFlowConnectors.of(rows) → useTreeController → useTreeVirtualizer
  → useFlowProgress: ChangeFlowProgress.of(entries, comparison)
  → FlowPanelStates.contentOf → progress | failed | notices | empty | tree
  → FlowPanelStates.progressOf → FlowProgressLabels.line → {ratio, phase} | null
row click or Enter
  → CallFlowNavigation.open: the call site in the caller (the declaration for entry points and removed functions)
    → navigation.revealLine + useSymbolHighlightStore.show
```

- the row shapes live in `call-flow-tree.ts`, and `CallFlowRowKeys` owns the row key format (`parent>child`, `:origin`, the not connected group).
- **rows**: entry points (changed functions nobody else in the change calls) sorted by path and line, each with its callees below in call line order. a group of mutually recursive functions that nobody else calls enters at its earliest function. an entry point shows where it is called from (`from ReviewMain +2`, an origin row from incoming calls or references, or the engine or scene text for Godot). functions without any edge go under a `Not connected` group. a call back into a function on the current path shows `recursive` and stops.
- a callee called from several places repeats its subtree under each caller, but only its first occurrence opens by default. `openWalk` picks the first occurrences with `collapsed` and `opened` ignored, so collapsing one never opens a later occurrence. later occurrences are drawn collapsed (`row.repeat`) and open on demand (`opened` set, not while filtering), so hub-heavy graphs stay linear in the number of calls instead of growing exponentially. `Expand all` clears `collapsed` and leaves repeats closed, `Collapse all` collapses every expandable first occurrence (`expandableKeys`), not only the visible rows.
- `CallStackRow`: elbow connectors (`TreeConnectors`), twisty, colored symbol kind icon (component, hook, function, method, engine callback, signal handler), a change icon (added, modified, removed with a strike through), the name, the file name with the function's own line muted (`game_state.gd:12`), and a via label for signal, connect and implementation edges (`ViaLabel`). the title is the name, `path:line` and, under a caller, the call site (`Called at player.gd:39`), which is where a click goes. the row of the file selected in the review gets the accent marker.
- the visual indent stops at 12 levels (`TreeMetrics.indent`, shared with the file tree), deeper rows keep the last levels of connectors.
- the filter matches names and paths, keeps the paths that lead to a match and shows everything under a match. while it is active, every first occurrence is open regardless of `collapsed` and `opened`, repeats stay closed (their subtree shows at the first occurrence), and the twisty toggles, `Expand all` and `Collapse all` are disabled. clearing it restores the previous view.
- **notices** above the tree, one `SidebarNotice` per server that is not ready, except a single `Not checked out` notice shared by every `needs-checkout` server (the stack scrolls past 40% of the height): not installed with `Install` (through `useLanguageServerActions`, the flow reloads by itself once the install lands, see `ChangeFlowInstallSync`), blocked by a missing tool or platform, installing with progress and `Cancel`, install failed with `Details` and `Retry`, failed with `Details` and `Retry` (refresh), unsupported (no call hierarchy, functions are listed without calls). the not installed, starting, indexing and failed titles come from `ServerStatusLabels`, shared with `DefinitionLabels.status`, while `unsupported` and `needs-checkout` keep their own wording per feature.
- the tree shows whatever the ready servers returned once no server is starting or indexing, so a failed or missing server never hides the others, and a build in progress never shows a partial tree (see **change flow**).
- **progress**: a `ProgressLine` (thin `ProgressBar` and one phase line) at the top of the panel replaces the loading and waiting spinners, and stays above the toolbar while the tree is shown and a server is starting or indexing. starting and indexing servers get no notice, the line covers them (`FlowServerNotices.isTracing`, `shown`), and the flow retries itself every 2s meanwhile (`ChangeFlows.retryMs`, one timer per comparison).
    - ratio: each server weighs the same, starting 0, reading 0 to 0.3 by files, tracing 0.3 to 1 by functions, done 1 (`FlowProgressRules.ratio`).
    - phase: the least advanced servers (`FlowProgressRules.lagging`): `Reading the changes`, `Starting gopls`, `Reading symbols in TypeScript, 40 of 112 files`, `Tracing calls in TypeScript, 412 of 1069 functions`, `Building the call tree`, plus `N of M servers ready` with more than one server. without a signal the line is indeterminate with `Tracing the changed functions`, or `Waiting for language servers` for a loaded flow.
    - the bar animates `scale` linearly and stops with reduced motion, the text does not animate.
- `ChangeFlowProgress` (services) keeps the latest `change-flow.progress` per comparison key: `ServerEventSync` stores it, `ChangeFlows` forgets it when a load settles with no server starting or indexing, `stream.resumed` clears it. progress of a comparison not on screen is kept but not shown.
- `ChangeFlows` (services) keeps one resource per comparison. `WorkspaceRefresh` invalidates flows with the change set rule, `stream.resumed` refreshes them, and `ChangeFlowInstallSync` (part of `ReviewSync`) invalidates every flow when the set of installed `server@version` changes (`LanguageServerStates.installedKey`), so the 250ms install progress signals never refetch flows.
- `HttpChangeFlowGateway` validates the body with `CallFlowShapes` (node, edge, origin) and `DefinitionShapes.status`. stories use `ChangeFlowFixtures` (`oversee` probe flow, `godot` fixture) and `Components/Sidebar/StressTest` (Demo / Worst case / Empty / One / Many). FlowPanel `Progress` and `Rebuild` drive `change-flow.progress` through `FlowBuildSimulation` on the in-memory event stream.

##### topbar
- a button that toggles the **sidebar**. it is an icon button that reflects the `expanded` or `collapsed` state with the proper icon.
- the **workspace breadcrumb**: the served folder name (`repo / folder` inside a subdirectory), then a slash, then the branch selection. the full path shows in a tooltip. the document title is `<folder> - oversee`.
- the **branch selection**: source and target branch, plus an option for viewing uncommitted changes.
    - the initial selection is `Uncommitted changes` against `main` (falling back to `master`, `develop`, then the current branch).
    - uncommitted changes always diff the working tree against `HEAD`. the target only matters for branch comparisons, where the diff runs from the merge base (or the target itself when the branches share no history).
    - the branch list follows git, see **file watcher**. when a selected source or target branch no longer exists (deleted, renamed, pruned), the selection switches by itself: a missing source becomes `Uncommitted changes`, a missing target becomes the default target. a warning bar between the topbar and the toolbar says what happened until it is dismissed or the next pick.
    - `ComparisonRules.replaceMissing` decides the switch, `BranchSelectionGuard` (part of `ReviewSync`) applies it on every branch list refresh and stores the notice in the comparison store, and `DeletedBranchNotice` (`NoticeBar`, warning tone) shows it. a selection the user never made just follows the default, without a notice.
- a `finish review` button, see **review sessions**.
- a **comments** button with a popover. it shows the comment count, see **review sessions**.
- a **notifications** button with a popover, see **notifications**.
- a settings button and its menu:
    - theme selection, light or dark.
    - font selection for the UI and the editor, powered by google fonts.
    - settings are saved in the workspace database, see **settings**.
    - `Language servers`: install, update and remove the catalog servers, see **language servers**.

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
- a newly shown file starts at the top: `DiffViewer` keys its scroller with `ComparisonRules.fileKey` (comparison and path, `ShownDiff.key`), so switching files or comparisons remounts it, while a silent refresh of the same file keeps the scroll position and a line reveal into the new file still lands.
- shows a centered placeholder (`DiffPlaceholder`) instead of a blank area:
    - `No changes` when the comparison has no changed files, with `The working tree matches HEAD` or `<source> has no changes against <target>`.
    - `No content changes` when the selected file's diff has no hunks: `Renamed from <path>`, `Empty file added`, `Empty file deleted` or `Only file metadata changed` (mode changes).
    - `DiffPlaceholders.of` decides it, `useDiffPlaceholder` drives it. failed loads and binary files keep their own states.
- holding Cmd (Ctrl elsewhere) over a symbol shows its definition and Cmd+click opens it in a tab, see **go to definition**.
- a function picked in the call flow stays highlighted until `SymbolHighlightSync` clears it (see **review sync**): `SymbolHighlights.css` turns the `useSymbolHighlightStore` range into `unsafeCSS` rules (an accent bar over the function's lines, a tinted focus line: the declaration, or the call line when the caller opens), and `useCodeSurface` appends them. css instead of row attributes, so it survives virtualized re-renders and shows in diff and read-only tabs.

##### tabs
- definitions open in tabs. `DefinitionTabStrip` (`TabStrip`, `TabItem`) shows under the topbar only while a definition tab is open: `Review` first (never closed), then one tab per target file.
- `Review` is pinned at the left and never scrolls. the file tabs scroll inside the strip without a scrollbar: a vertical wheel scrolls them sideways, and the edges fade where more tabs are hidden. while the tabs overflow, a group at the right end holds page left and page right (`ScrollButtons`, disabled at the ends, smooth unless reduced motion is preferred) and `OpenFilesPopover`, a list of every open file that becomes filterable past 10 files. `useTabStripOverflow` and `TabStripOverflow` own the scroller (edges, fade mask, wheel, paging) and keep the active tab in view when it changes, when the same tab is re-targeted (`DefinitionTabs.revealKey`), or when the strip resizes. the fade mask is only set while an edge is hidden.
- a tab is one file (`DefinitionTabs.idOf`, the same key as `FileContentRequests.key`: repo or external, and the path). its view follows the current change set (`DefinitionTabs.viewOf`, `useTabView`): a file in the change set shows a **diff tab** (`DiffTabView`, the same `FileDiffView` with unchanged regions expanded, comments work there), anything else a **read-only tab** (`FileTabView`, pierre `File`) with a `NoticeBar` (`ReadOnlyFileNotice`): `Not changed in this comparison`, or `Outside the repository` for files outside the repo. a repo file that no longer exists (`/api/file-content` 404, `ApiError.isNotFound`) shows `This file no longer exists` (`DefinitionLabels.missing`) instead of the notice and the content. external tabs keep the read failure with retry, because the server also answers 404 for an external path that no lookup of this serve process returned. a file that enters or leaves the change set switches its tab's view. external files are always read-only, and repo tabs show the diff tab's loading state until the change set is ready. read-only tab titles are italic.
- tab titles keep their last 10 characters visible and truncate before them, so `x.controller.ts` and `x.controller.spec.ts` stay apart. tabs that share a file name get the shortest distinguishing parent folder as a muted hint (`index.ts billing`), and their `aria-label` carries the full name and hint (`DefinitionLabels.tabTitles`). the active tab is kept in view (see the overflow line above).
- file names and folders split on `/` and `\` (`PathParts`, shared with the tree and language server labels), so windows paths of external files show their file name.
- both views share `TabResourceView` (loading bar, `LoadFailure` with retry, the virtualized scroller) and `useCodeSurface` (editor metrics, the base pierre options, definition interactions and the line reveal). a diff tab shows a failed change set as its failure. `useFileDiffResource` finds the change and its diff resource for both the review diff and diff tabs.
- opening a target that already has a tab focuses it and moves its line. closing a tab returns to the tab it was opened from.
- `TabPanel` renders the active tab: Review keeps the toolbar, the install notice and the diff viewer. definition tabs replace them.
- comment paths open tabs too, see **comment locations**.
- the tab reveals its line with `useLineReveal`: it jumps through `getLinePosition` until the line is rendered (positions of unrendered lines are estimates), then centers it and flashes it (`data-reveal-line`). a jump that would not move the scroll position is skipped, so pierre is not interrupted while it renders. the target carries its side, so old side lines reveal in the deletions column. scrolling, clicking or typing stops the reveal. a `LoadingBar` shows until the line lands. it runs once per reveal request, so a silent refresh of the file never scrolls back to the line. a target past the end of the file (it got shorter since the lookup) reveals the last line (`DiffLineReveal.lastLine`). the flash attribute, its duration and its css live in `DiffLineReveal`.
- editor rows use a whole pixel line height (`DiffSurface.lineHeight`, written to `--editor-line-height-px` and pierre's `--diffs-line-height`), so rendered rows match the virtualizer metrics. a fractional height (19.2px) is laid out as 19.203125px and drifts from pierre's estimates in long files.
- far lines of large files still land late: pierre tokenizes progressively in the worker, and a window renders only after its lines are tokenized.
- the strip is a `tablist`: arrow keys, Home and End move between tabs, Delete or Backspace closes the focused tab, and the active content is the `tabpanel` (`TabContent`).
- `DefinitionTabs` owns the rules, `useTabStore` holds them. `DefinitionTabsSync` (part of `ReviewSync`) resets the tabs when the comparison changes and shows Review when a file is picked in the sidebar, the toolbar, a comment or an outdated comment (`NavigationStore.selectedAt`; the automatic selection after a file leaves the change set uses `followFile` and keeps the tab).

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
- outdated comments are **hidden from the diff**. the `Current` tab shows a notice row (`2 outdated comments`) that drills into an **Outdated** view: each comment with its saved code, `Open file` (always shown, see **comment locations**) and `Delete`, plus `Delete all`.
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
- selecting a session drills into it inside the same popover (with a back button). `ReviewSessionLoader` shows it: `useReviewSession` uses the current comparison's listed session when it has one and fetches it by id otherwise, so a session of another comparison opens there too. each comment shows its file and line range (a link, see **comment locations**), the saved code lines with **syntax highlighting** (same theme as the diff view), the full comment text as markdown and its replies. one-line rows (the `Current` tab) use `CommentMarkdown.summary` instead.

##### how it works
- `ReviewSessionGateway` (http, and in-memory for stories) and the `ReviewSessions` class own the data. finishing updates the session list and clears the active comments. `ReviewSessions.session(id)` loads a single session from any comparison.
- `useCommentsMenuStore` holds the popover state (open, tab, opened session, Outdated view, comment focus), so a notification can open it. the opened session, the Outdated view and the focus reset once the popover finishes closing (`onOpenChangeComplete`, `resetAfterClose`), so a reopened popover never shows another comparison's session. `showComment(sessionId, commentId)` opens the session in `Sessions`, and `SessionCommentItem` (`useSessionCommentFocus`) scrolls that comment into view and plays the highlight ring once. the comments menu store and the navigation store build and clear focus requests with `CommentFocusRequests` (`request`, `requestedAt`, `cleared`), and `useFocusHighlight` gives `useCommentHighlight` and `useSessionCommentFocus` their highlight key and `endHighlight`.
- `useFinishReview`, `useReviewSessions`, `useReviewSession`, `useCommentsMenu` and `useSnippetHighlight` drive the UI. `SnippetHighlighter` tokenizes saved lines with the shared `@pierre/diffs` highlighter and keeps the 200 most recently used results, dropping a failed one so the next view retries it.
- `ReviewComment` carries `lines` (the saved snapshot) and `outdatedAt` (`null` while live). `CommentLists.live`/`outdated` split them, `CommentLabels` builds the count, notice, age and finish texts, and `useOutdatedComments`/`useOutdatedComment` drive the Outdated view.

##### comment locations
- the file path of a comment in the comments popover (session detail, Outdated view) is a link to where the comment points, also when it is outdated or its session is finished. it keeps the current comparison.

```text
comment path click
  → CommentLocations.targetOf(comment, current change set)
    → file in the change set (path or previousPath) → navigation.revealLine(path, side, line)
      → Review tab, the file selected, the line revealed and flashed
        → line outside the hunks (`DiffLineReveal.isInHunk`) → unchanged regions expanded until the next file pick
    → otherwise → useTabStore.open (read-only tab at the line)
      → the file is missing → `This file no longer exists`
  → the popover closes
```

- the side follows the range, a deleted file always reveals the old side and an added or untracked file the new side. `useCommentLocationOpener` runs it for both the session detail and the Outdated view.

## notifications

- agent actions (`review start`, `review close`, `review reply`) create **persisted** notifications with a read state, so things that happened while the UI was closed still show up.
- the topbar bell shows the unread count. its popover lists notifications newest first, with a `Mark all read` action.
- clicking a notification marks it read. a status notification drills into its review session inside the same popover, even when the session belongs to another comparison. a reply notification closes the bell and opens the **comments popover** at the replied comment (`useCommentsMenuStore.showComment`), scrolled into view and highlighted with its reply.
- `NotificationGateway` (http and in-memory) and the `Notifications` class own the data. `useNotifications` and `useNotificationsMenu` drive the UI.

##### server events
- `EventStream` is the push gateway: `SocketEventStream` in the app, `InMemoryEventStream` in stories.
- `ServerEvents` validates incoming envelopes at the boundary. `ServerEventSync` applies them to the services and is started by `ReviewSync`, see **review sync**.

##### review sync
- `ReviewLayout` mounts one hook, `useReviewSync`. it starts `ReviewSync` on mount and disposes it on unmount.
- `ReviewSync.start()` starts each reaction and returns one dispose that undoes them all (`Disposers.all`):
    - `ServerEventSync`: event stream into the services.
    - `BranchSelectionGuard`: switches the comparison when a selected branch is gone, see **branch selection**.
    - `ReviewedMarksSync`: persists reviewed marks and prunes them against the current change set, see **reviewed marks**.
    - `DocumentTitleSync`: keeps `document.title` on `<folder> - oversee`.
    - `InstallCompletionWatch`: shows the install notice's ready state for 2.5s after a language server goes from installing to installed, see **language servers**.
    - `DefinitionTabsSync`: resets and focuses definition tabs, see **tabs**.
    - `SymbolHighlightSync`: clears the symbol highlight when the followed comparison changes, the highlighted file leaves its change set or gets a new revision, or a new change flow graph of the followed comparison has no node at the highlight's path with the same start and end lines.
    - `ChangeFlowInstallSync`: invalidates the change flows when the installed language servers change, see **flow mode**.
- reactions subscribe to the zustand stores outside React (`AsyncResource.store`, and the app stores through the `ComparisonSelection`, `FollowedComparison`, `ReviewedMarksStore`, `ReadyServerPort`, `ReviewNavigation`, `DefinitionTabsPort` and `SymbolHighlightPort` ports that the hook builds), so they never re-render the layout and they act before React renders. `ReviewedMarksSync` and `SymbolHighlightSync` follow the selected comparison's change set through `FollowedChangeSetWatch`. a reaction that needs the current state first uses `AsyncResource.follow(listener)`, which applies the current state and then subscribes.
- event kinds: `session.finished`, `session.status`, `comment.replied`, `notification.created`, `notifications.read`, `comments.reconciled`. session events silently refresh the cached session lists, without showing a loader. `comments.reconciled {sessionId, comparison}` silently refreshes that comparison's comments.
- signals: `workspace.changed {paths, refs}` has no id and is never stored, see **file watcher**. `change-flow.progress {comparison, servers}` has no id and is never stored, see **change flow**. `stream.resumed` is emitted by `SocketEventStream` itself when the socket reconnects and clears the flow progress.

## file watcher

- `oversee serve` keeps the UI in sync with the files on disk, so nobody reloads the page after editing a file or running git.
- **detection**: `WorkspaceWatcher` polls git instead of using OS file events. every tick builds a `WorkspaceFingerprint`:
    - `git --no-optional-locks status --porcelain=v2 -z --branch --no-ahead-behind --untracked-files=all`, plus `os.Stat` (size and mtime) of every listed path. status alone does not change when an already modified file is edited again.
    - `git for-each-ref` over `refs/heads` and `refs/remotes`, plus HEAD and the current branch.
    - `ChangesSince(previous)` returns the changed paths and whether any ref moved.
- **timing**: one tick per second. the first tick runs at startup and reconciles every open session. later ticks run only while a websocket client is connected.
- **settle rule**: a change is applied only when two ticks in a row agree and `.git/index.lock` does not exist, so a half-done checkout, stash or rebase is never acted on. the UI updates in 1-2s.
- on a settled change, `CommentService.Reconcile` runs first (see **outdated comments**), then the listeners added with `WorkspaceWatcher.Listen` (`DefinitionService`, see **go to definition**, and `ChangeFlowService`, which bumps its working tree generation, and its refs generation when refs moved, see **change flow**), then the hub broadcasts `workspace.changed`.
- `.oversee/` is in `.git/info/exclude`, so database writes never look like a workspace change.
- several `serve` processes on one workspace are safe: each one reconciles, the writes are compare-and-set, and an event is appended only when rows changed.
- **UI side**: `ServerEventSync` hands the change to `WorkspaceRefresh`.
    - refs moved: invalidate the branch list, every change set and every cached file diff. the refreshed branch list drives the deleted branch switch, see **branch selection**.
    - otherwise: invalidate the uncommitted change sets and change flows, and the cached diffs whose `path` or `previousPath` changed. refs moved also invalidates every change flow.
    - `AsyncResource.invalidate()` refreshes resources on screen (`useResource` registers them through `watch()`) without a loader, and marks the others stale so they refetch on their next view. a resource runs one refresh at a time: refreshes asked for meanwhile queue exactly one more fetch after it settles, so long held requests (`GET /api/change-flow`) never pile up.
    - reviewed marks whose file got a new revision drop when the change set refreshes, see **reviewed marks**. when the selected file leaves the change set, the selection moves to the file now at its position.
    - an open comment composer keeps its draft across refreshes.
    - `HttpFileDiffGateway` and `HttpFileContentGateway` put a per-load revision into the `@pierre/diffs` `cacheKey` (`HttpGateway.revisionKey`). with a fixed key, pierre keeps rendering the cached old contents after a refetch.
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

## language servers

- go to definition runs through language servers that oversee installs on demand. the supported servers are a curated catalog built into the binary, installed app wide under `~/.oversee/lsp` (`OVERSEE_HOME` overrides `~/.oversee`).
- **catalog**: `internal/cataloggen/servers.json` lists the servers (typescript-language-server, pyright, gopls, rust-analyzer, clangd, jdtls, omnisharp, intelephense, kotlin-language-server, lua-language-server, bash-language-server, zls) with their file types keyed by LSP language id, launch args, root markers and extra requirements. every extension and filename belongs to one file type, and every file type to one server.
    - `go run ./cmd/catalog-gen` resolves them against the latest mason-registry release (verified with its `checksums.txt`) into `internal/catalog/catalog.json`, which is embedded and read with `catalog.Embedded()`. versions, downloads per platform and binaries come from mason, sha256 checksums from GitHub asset digests or by hashing the file.
    - a server that fails to resolve keeps its previous entry, a platform that fails is dropped with a warning. `skipFiles` drops optional files with mutable urls (jdtls `lombok.jar`).
    - `.github/workflows/catalog.yml` runs weekly and opens a `catalog/update` pull request when a server changed, so only reviewed versions ship with a release.
    - `${dataDir}` (`catalog.DataDirArgument`) in run args and in string values of `run.initializationOptions` stands for a per project data directory (jdtls `-data`, rust-analyzer `cargo.targetDir`). `Run.WithDataDir` replaces it, and `Launcher.Start` creates the directory only when the run uses it and returns the resolved initialization options.
    - `minimums` sets a major version per required tool (jdtls `java` 21, omnisharp `dotnet` runtime 6), and `catalog.Validate` only accepts it for a tool with a version probe (`versionedRequirements`). `Toolchain.Command` resolves java once, `$JAVA_HOME/bin/java` when it is a regular file and `java` on PATH otherwise, for the presence check, the version probe and `java-jar` launches. `Toolchain.Missing` probes `java -version` and `dotnet --list-runtimes` (cached for a minute per command) and reports as missing a probe that can not run, a dotnet without a `Microsoft.NETCore.App` runtime, and a tool that is too old, with `outdated: [{tool, minimum, found}]` in the list, so the UI says `Needs java 21 or newer on PATH`. a probe that times out or prints an unknown version does not block.
    - rust-analyzer runs with `checkOnSave: false` and `cargo.targetDir: ${dataDir}/target`, so it never builds into the reviewed repo's `target/`. `cargo metadata` can still create a missing `Cargo.lock`.
    - `run.initializationOptions` is sent as the `initialize` request's `initializationOptions`. typescript-language-server sets `tsserver.useSyntaxServer: never`, because its syntax server answers definitions while the project loads and only knows the import binding in the same file.
    - `catalog.Validate` (run by the generator and by `Embedded()`) only accepts https urls, plain file names, relative slash paths without `..`, `\` or `:`, known bin kinds and a run bin present on every platform. `Install.Requirements`, `AvailableOn`, `DownloadFor`, `Catalog.FileTypeOf` and `Catalog.ServerFor` own the shared rules.

```text
POST /api/language-servers/{id}/install
  → LanguageServerService.Install
    → already at the catalog version → 200, nothing started
    → no build for this platform or a requirement missing on PATH → 409
    → install job → 202 (one per server per process, outlives the request, cancelled by DELETE .../install or on shutdown), 409 while it is being removed
      → fails after 3 minutes without activity: downloaded bytes, or any output of npm (--loglevel=http) and go install (-v). a slow download that keeps moving never times out
      → langserver.Installer: temp dir under lsp/.tmp
        → npm install --prefix --ignore-scripts | GOBIN=<dir>/bin go install -v | download, sha256 check, extract (zip, vsix, tar.gz, tar.xz, gz) through os.Root
        → entry file checked through os.Root → oversee-install.json manifest → rename to lsp/<id>/<version> (first rename wins across processes)
      → stop the server's sessions → remove the older versions
      → language-servers.changed signal (no id, never stored) when a job starts, while it downloads through one throttle shared by every install (at most every 250ms, with a trailing signal), and when it ends (which replaces a pending trailing signal)
```

- `GET /api/language-servers` returns the platform, the file types and every server with its `status` (`not-installed`, `installing`, `installed`, `failed`), installed version, `updateAvailable`, missing requirements and the last install error. `DELETE /api/language-servers/{id}` claims the server (409 while installing), stops its sessions and removes every version and its data. `DELETE /api/language-servers/{id}/install` cancels a running install and returns 204, also when nothing runs. a canceled install records no failure, so the server goes back to its previous state.
- install jobs live in the serve process that started them. another serve process sees the result on its next list.
- `langserver.Installation.Command` resolves the launch command per bin kind (`exec`, `npm`, `golang`, or `node`, `python`, `java-jar`, `dotnet` through the toolchain). on windows the store alias of python does not count as installed, and killing a server kills its process tree (`taskkill /T`).
- installs and removals are guarded per server inside one serve process only. several serve processes share `~/.oversee/lsp`, so a removal in one can delete a version another one is running.
- archives never create absolute or rooted links, links that leave the install directory, or links through another link. link targets are cleaned before they are created.
- `http.CrossOriginProtection` rejects cross-origin non GET requests (`Sec-Fetch-Site`, or `Origin` against `Host`), because installs run toolchains. `GET /api/definitions`, `/api/file-content` and `/api/change-flow` also answer 403 to any `Sec-Fetch-Site` other than `same-origin` or `none` (`sameOrigin`), so pages on other localhost ports can not start language servers or read files.
- the language server stack (catalog, pool, and the language server, definition and change flow services) is built by `App.Server` before the port is opened, so `review` commands never resolve the app home. `Server.Serve` waits for the shutdown and the follow goroutines before `App.Close` runs.
- JSON responses and the LSP connection accept invalid UTF-8 (replaced with U+FFFD), so files in other encodings still diff and resolve.
- `oversee init` and `RequireInitialized` check the database file, not the `.oversee` directory, so `~/.oversee` never looks like an initialized workspace.

##### UI
- **install notice**: `LanguageServerNotice` is a `NoticeBar` between the toolbar and the diff. it shows when the selected file belongs to a catalog server that is not installed:
    - offer (`Install`, `Not now`), blocked by a missing requirement or a platform without a build (`Dismiss`), installing (size, a progress line and `Cancel`, `aria-busy` so screen readers skip the ticks), failed (`Details`, `Retry`, `Not now`).
    - after an install finishes it says `Go to definition is ready for <files>` with `Hold <modifier> and hover or click a symbol` for 2.5s. `InstallCompletionWatch` (part of `ReviewSync`) compares the list states and writes the ready id into `useLanguageServerStore` through `readyServerPort`.
    - a download without a known size reports no total, so the UI shows the downloaded size alone instead of a ratio.
    - `Not now` and `Dismiss` store the server id in the `dismissedLanguageServers` setting, so the notice stays away in that workspace. the settings panel still installs it.
- **settings panel**: the settings overview row shows the installed count and opens `LanguageServerSettings` (a wider `w-80` view): a filter by name or language, then one `ServerRow` per server with its languages, status line, a `Requires` line that marks tools missing from PATH, a progress line while installing, an expandable error log after a failed install and its actions. `Remove` asks first with a compact `ConfirmPrompt` (`RemoveLanguageServerButton`), because it deletes the files and the project data.
- `LanguageServerStates` owns the rules (actions `install`, `update`, `retry`, `remove`, `cancel` while installing, blockers, tone, filter match, and `installState` of a server that is not installed, shared by `LanguageServerNotices` and `FlowServerNotices`), `LanguageServerNotices.of` picks the notice, `LanguageServerLabels` builds the texts and `LanguageServerFiles` maps a path to its file type, server and label (`.ts files`, or the matched filename).
- `useLanguageServers`, `useLanguageServerActions` (request failures kept per server in `useLanguageServerStore`, so the install notice, the flow notices, the definition popover and the settings panel show the same failure next to the server), `useLanguageServerNotice`, `useLanguageServerSettings` and `useRemoveLanguageServer` drive the UI. `language-servers.changed` and `stream.resumed` refresh `LanguageServers.list` through `ServerEventSync`, which is how install progress reaches the UI.

##### go to definition

```text
GET /api/definitions?source&target&side&path&line&character   (line 1-based, character 0-based utf-16, as the diff renders it)
  → DefinitionService.Find
    → Catalog.ServerFor: file type by filename, then extension, and its server → none → unsupported
    → server not installed → not-installed
    → comparison not on disk (a branch other than the checked out one) → needs-checkout
    → side content from git → root: nearest directory with a root marker, else the repo root
    → lsp.Pool.Client(server, version, root): one session per key, started on the pool lifetime, not the request
        → still starting after 10s → starting · start failed or crashed → failed (restarted after 15s)
      → one request at a time per session (waiting respects the deadline, a cancelled request sends $/cancelRequest): didOpen with the side content → textDocument/definition → didClose, or, while a flow batch holds the file with another text, didChange to the side content and back
      → a timeout, an answer RequestCancelled, ContentModified or ServerCancelled, or an empty result while the server reports $/progress or in its first 20s → indexing · other errors → failed
    → locations: repo relative path, or an absolute external path (standard library, module cache), its 1-based line and 12 snippet lines
```

- definitions and the change flow share `domain.ServerStatus` (`ready`, `unsupported`, `not-installed`, `needs-checkout`, `starting`, `indexing`, `failed`) and one error mapping, `serverStatusOf(ctx, err)`: `lsp.ErrStarting` while the caller's context is alive is starting, a done context, a deadline, a cancel or an `lsp.IsRetryable` answer is indexing, anything else is failed. only failed carries the error text (`ServerStatus.ErrorOf`).
- each definition carries a `side`. a definition inside the queried file uses that side's line numbers and content, everything else is a working tree position read from disk (`new`).
- `WorkspaceChanged` forwards the changed paths, plus the files that differ between the old and new HEAD (`git diff --name-only --no-renames`), as `workspace/didChangeWatchedFiles`. sessions keep running across commits and checkouts. they are only stopped when that diff fails.
- every write to a server, request or notification, is bounded at 5s (`writeTimeout`) and kills the server when it blocks. a cancelled request only sends `$/cancelRequest`. frames over 64 MiB count as a broken connection.
- without the syntax server, the first lookup of a new tsserver session waits for the project to load (about 4s on now-api, including the start). a project that loads slower than the deadline answers `indexing`.
- sessions close after 10 minutes without requests, on uninstall, after an update install and when serve stops (shutdown, exit, then kill through the session context). a framing error or a crash kills the process, and a crashed session is restarted after 15s.
- `${dataDir}` resolves to `~/.oversee/lsp/.data/<id>/<root hash>`.
- `langserver.Launcher` resolves `${dataDir}` and starts the process, `langserver.Project` owns root markers, path mapping and disk reads for the service.
- `GET /api/file-content?path=<repo path>` reads a working tree file through `os.Root` (no links out of the repo). `?external=<absolute path>` reads a file outside the repo, but only a path that a definition lookup of this serve process returned (`externalPaths`, the last 512). directories and missing files are 404, and so are links that leave the repo or dangle (`Project.ReadRelative` resolves them only when the `os.Root` read fails, so a real read error stays a 500). binary files and files over 8 MiB (`langserver.FileTooLargeError`) are 400. the read stops one byte past the limit, so a file that grows after the size check is rejected too.

```text
diff token (pierre onTokenEnter/Leave/Click, useTokenTransformer in the worker pool too)
  → DefinitionHover: modifier held (pointer flags, keydown/keyup/blur) + hovered token → open after 180ms, or 80ms when moving to another symbol while a popover is open (a pointer sweep sends no lookups)
    → useDefinitionLookup (useKeyedPromise keyed by DefinitionQueries.key: comparison, side, path and position) → Definitions.find (cached ready lookups, dropped on workspace and language server changes)
      → DefinitionPopover: the definition line highlighted, its location and a 1 / N pager, or the status
      → the token is underlined only while the popover shows at least one definition
  → Cmd+click, or a click on the popover line → useDefinitionNavigation → useTabStore.open (diff or read-only tab)
```

- the popover stays open while the pointer is over the token or the popover, Escape closes it. after Escape, press the modifier again or move to another symbol.
- a Cmd+click that opens no definition (a failed request, `starting`, `indexing`, no result) shows the popover with its status for the token that is still hovered. a lookup that resolves after the tabs were reset (comparison change) opens nothing: `useTabStore.reset` bumps `generation`, and `open` ignores a stale one.
- read-only tabs of repo files look up definitions too. tabs of files outside the repo do not, the server only resolves repo paths.
- the popover location truncates the folder from the start before it truncates the file name, the pager count never wraps, and a failed request shows its status instead of the request url. snippet gutters grow with the widest line number (`SnippetHighlighter.gutterWidth`). the read-only notice truncates its path from the start (`NoticeBar detailTruncation`). paths that keep their end visible use the `StartTruncate` primitive (`dir=rtl` with a `bdi`), also behind `FilePathLabel` and `LocationLabel`.
- `Components/Definitions/StressTest` (Tabs and Popovers) renders the definitions UI with worst-case data behind a Demo / Worst case / Empty / One / Many toggle (`data` arg, kept in the url). its fixture (`definition-stress-fixture.ts`) is the regression set for these components.
- `DefinitionLabels` builds the popover, tab and status texts, `DefinitionSnippets` turns a snippet into highlighted lines, `DefinitionTargets` maps a definition to a tab.
- verified on darwin-arm64: gopls, typescript-language-server, pyright, rust-analyzer, clangd, lua-language-server, bash-language-server, zls, intelephense, kotlin-language-server. jdtls (needs Java 21) and omnisharp (needs dotnet) are not verified yet.

##### change flow
- the call graph between the changed functions of a comparison, for the sidebar **flow mode**. one blocking request that answers with a status per language server.

```text
GET /api/change-flow?source&target
  → ChangeFlowService.Flow: one build per comparison, shared by concurrent requests
    → key: comparison + generation. the generation is the refs generation (bumped when refs moved), plus the working tree generation (bumped on every settled change) for uncommitted comparisons, so working tree edits never touch branch comparison builds. grouping records the installed server@version of the servers the changed files map to, and a request whose installed versions of exactly those servers differ starts a new build, so other installs never touch the flow
    → a newer key cancels the running build only before it reached the grouping, its waiting requests join the new one. past the grouping the newest key is queued (at most one, a newer key replaces it) and starts when the running build finishes. a comparison whose builds no request awaited for flowWait plus 10s has its running build cancelled and its queued build dropped
    → the request waits at most 20s (flowWait): a build still running answers the comparison's last complete graph (no server starting or indexing) with every server of the unfinished build indexing, or without one only its server statuses, and keeps going, the next request joins it
    → build in the service lifetime, 5 minute deadline (flowTimeout)
      → git.Repository.ChangedLines: diff -U0 -M hunks per file (entries without hunks, such as binary files, mode only changes, empty files and pure renames, are left out), untracked files as whole file additions
      → group files by catalog server and root marker, not installed servers → not-installed, a failed installation lookup → failed. a group with a settled result kept for this generation, server@version and root is reused, the others are walked
      → comparison not on disk (checked only when a group exists) → needs-checkout for every group
      → one ContentsOf per side for the documents of every group, up to 8 MiB (langserver.ReadLimit), the old side only for files whose hunks remove lines
      → per group, at most 4 at a time (flowGroupLimit): lsp.Pool.Client, still starting after 10s (flowStartWait) → starting, no documentSymbol → unsupported
        → Batch (didOpen every new side file once and keep it open for the walk, each request takes the session slot on its own, so definitions run between them)
          → documentSymbol → units (outermost callables, class members, multi line values) touched by a hunk → nodes (added when the unit's whole span lies in added lines or the file has no old side, modified otherwise, and modified again when the old side has a unit with its name)
          → prepareCallHierarchy (an empty or failed prepare drops plain value units and keeps callables, hooks and components as nodes without calls) → outgoingCalls → call edges to other changed functions (the call line in the caller), calls into another group's files are kept for the link step, callees outside the build's repo path set (TrackedPaths plus the changed paths) are skipped
          → implementation of every called method, function, property, field or interface inside the repo path set (cached) → implementation edges, so interface calls reach the changed implementation (library interfaces are not bridged, gopls reports interface methods as functions)
          → entry points: incomingCalls → origins, references when there are no callers
        → second Batch, only for files whose hunks remove lines, with the old side as .oversee-previous.<name> → documentSymbol → removed units (name gone from the new side) → removed nodes, never connected
        → a gap (an empty prepareCallHierarchy or a failed request) while the server is in its first 20s or reports $/progress, or a request answered RequestCancelled, ContentModified or ServerCancelled → indexing
        → deadline or cancel → indexing, other errors → failed
      → changed .gd files → the build's TrackedPaths (read once, shared with the LSP groups) plus the untracked files → Godot projects (nearest directory with project.godot, the rest under the repo root, scripts and scenes under a .gdignore skipped), analyzed one after another in one goroutine, in parallel with the groups and also when the comparison is not checked out
        → one ContentsOf(new side): every .gd and .tscn of the projects and project.godot · one ContentsOf(old side): changed scripts whose hunks remove lines → gdscript.Analyzer.Flow per project, see **gdscript**
        → server gdscript: ready, failed on a read error, indexing on the deadline. a settled graph is kept with the settled group results per comparison and generation, so retries reuse it and the pending graph includes it
      → merge the groups (FlowBuilder.Include), then link the calls between groups (FlowBuilder.Link, a callee that gains a caller drops its origins), one status per server: the worst of its roots (failed, indexing, starting, not-installed, needs-checkout, unsupported, ready)
    → builds with a starting, indexing or failed server, or an error, are not reused, so the next request builds again and walks only the groups without a kept settled result
    → a finished build with a server still starting or indexing answers the last complete graph with its own statuses, or only its statuses (`comparisonFlow.shown`), so the UI never shows a partial tree. failed, not-installed, needs-checkout and unsupported are final and never hide the other servers' graph
  → dto.ChangeFlowOf → {servers [{server, status, error}], nodes [{id, name, kind, path, line, endLine, change}], edges [{from, to, line, via, label}], origins {id: [{name, path, line}]}}
```

- the domain owns the rules: `UnitsOf` (members of class-like containers, `CodeSymbol.ClassLike`, and flat symbols with a container are methods, callables in a module or namespace keep their qualified name and stay functions), `LineChanges.TouchedUnits`, `ChangeOf` (added when the unit's span lies in added lines or there is no old side), `RewrittenUnits` (units `ChangeOf` calls added whose name exists on the old side, relabeled modified by `FlowBuilder.AddRemovals`, which also adds the `RemovedUnits` as removed nodes, for both the LSP walk and the GDScript analyzer), `RemovedUnits`, `RemovesLines` and `Opens` (the new side when it exists, the old side only when lines are removed), `FlowServerUnavailable` (failed when the installation lookup failed, not-installed otherwise), `FlowUnit.PlainValue` (a value that is not a hook or component), `FlowGraph.Rebuilding` (a finished graph with the given servers indexing), `FlowUnit.Kind` (`hook` for `useX` in ts and js, `component` for PascalCase functions in tsx and jsx, `method`, `function`), `FlowBuilder` (nodes by `path#line`, removed nodes `path#removed-N`, edges deduplicated to the earliest call line, no self edges, entry points, origins sorted by path, line and name, merge, links between groups).
- `via` is `call` or `implementation` from language servers, `signal` and `connect` are reserved for the Godot rules (EPIC-38), with the signal name as `label`.
- the LSP client asks for `documentSymbol` (hierarchical, or flat `SymbolInformation` qualified with its `containerName` and listed without calls, because its name position is unknown), `callHierarchy`, `implementation` and `references` and reports them in `Client.Capabilities()`. `Client.Batch` opens a set of documents once for many requests (the client keeps text, version and open count per URI and never opens a URI twice), stops opening them once its context is done, takes the session slot per request (sending its text back with didChange when another batch replaced it) and closes each document when its last user is done. `Client.Definition` swaps a held document's text with didChange inside its own slot hold and restores it.
- errors: `ValidationError` 400, `ErrUnknownBranch` 404, everything else 500.
- large comparisons take a while on a cold server (now-api, 549 changed files: 1202 functions, 952 calls, about 90s from a cold tsserver), the UI shows `indexing` and retries until the build lands, then answers from the cache.

```text
build start, grouping, counter changes and end (ChangeFlowService.Follow → ws.Hub.PublishFlowProgress)
  → flowReporter per comparison: only the newest started build reports, a cached answer reports nothing
    → start: empty servers (reading the git changes) · grouping: every server · end: every server done (start, grouping and end skip the throttle)
    → flowTally per group (reading files, tracing functions, done) → throttle: at most one signal every 250ms, the trailing one carries the latest state
  → flowProgressFeed: latest progress per comparison, drained by Follow → change-flow.progress {comparison, servers [{server, phase, done, total}]}
```

- `servers` has one entry per server, sorted by id. `phase` is the least advanced phase of its groups (`starting` < `reading` < `tracing` < `done`), and `done`/`total` count every group in that phase's unit (files while `reading`, functions while `tracing`, 0 otherwise), a group past it counting as complete. `domain.NewFlowProgress` owns the rule.
- a function is traced once its walk is complete: dropped by prepare, its outgoing calls walked with a caller in its group, or, for an entry point, its incoming calls and references read. not installed, needs checkout, failed lookups and kept results are `done` at grouping, `gdscript` is `starting` until its analysis ends.
- a build whose files map to no server only sends empty server lists, so the UI treats the HTTP answer as the end. a slow follower gets the latest state per comparison, not every signal. `throttle` takes a `clock` (`ChangeFlowService.clock`).

##### gdscript
- Godot has no standalone language server with call hierarchy, so GDScript goes through our own analyzer in `internal/gdscript` (EPIC-38), wired into `ChangeFlowService` as the `gdscript` server (see the change flow block). it reads through git, so it needs no checkout.
- `git.Repository.ContentsOf` reads many files at once up to the caller's size limit: the working tree through `os.Root` for the new side of uncommitted comparisons, one streamed `git cat-file --batch` for a ref or the merge base side. missing paths, paths over the limit, non-blob objects and working tree entries that are not regular files are left out. `git.Repository.TrackedPaths` lists `ls-files --cached`, or `ls-tree` of the source for branch comparisons, without a ref check.

```text
gdscript.Analyzer.Flow(ProjectSources{Root, Settings: project.godot, Scripts: every .gd on the new side, Scenes: every .tscn, Previous: old side of changed scripts that remove lines}, changed lines)
  → parse the scripts not in the cache (key: sha256 of the content, swept by a timer 10 minutes after the last use, files over 2 MiB skipped)
    → parsers pooled in the Analyzer (sync.Pool, bonsai parsers are not goroutine safe), at most GOMAXPROCS parses at once across all Flow calls
    → Parse → Script: class_name, extends (name or res:// path), members (untyped ones too), signals, inner classes, functions (span, name position, calls, emit sites, connect sites)
  → ParseScene: nodes by path (script or instanced scene), [connection] entries with their line
  → NewProject: class_name registry, autoload singletons ([autoload] entries with *res://...gd), res:// and relative paths under Root
  → Project.Wire over every function and scene: callers per function, emitters per signal, connections (code and scene) per handler
  → functions touched by a hunk → nodes named <class_name or PascalCase file stem>.<inner class>.<function>, role callback (engine callback names), handler (connected, or the _on_ prefix) or method
  → call edges (Project.Resolve), signal edges (emitting function → handler, at the emit line, label = signal), connect edges (connecting function → handler, at the connect line)
  → old side functions whose name left the new side → removed nodes (only when the new side parsed or the file was deleted)
  → entry points get origins: the engine callback text, the scene connection (`Hurtbox.area_entered` at player.tscn:24), and the connecting, emitting and calling functions outside the change
```

- **resolution**: bare and `self.` calls look up the class and its extends chain, `super.f()` and `super()` start at the parent. `x.f()` resolves `x` as a typed local or parameter (scoped to its block: bodies, for loops, match sections, lambdas), a member (typed, `:= Type.new()`, `preload`/`load`, along the extends chain and the script's top level), a type name (inner class, `const X = preload(...)` alias, a `class_name` declared by only one script of the project) or an autoload. `(x as Type).f()` uses the cast type, and inside `if x is Type:` (also joined with `and`, never `is not`) `x` is that type. a member chain (`player.stamina.f()`) follows typed members step by step. untyped parameters, locals, for variables, pattern bindings and members shadow the outer names and stay unresolved, like receivers that are calls (`get_x().f()`), `$Node.f()` and engine classes, so an edge is never a guess.
- **signals**: `sig.emit()`, `obj.sig.emit()` and `emit_signal("sig")` are emit sites, `sig.connect(handler)`, `obj.sig.connect(handler)` and `connect("sig", handler)` are connect sites (handler: `f`, `self.f`, `obj.f`, `f.bind(...)`, `Callable(obj, "f")`, lambdas are skipped). `x.emit()` and `x.connect(handler)` also record a call, so a project method named `emit` or `connect` still resolves. a signal is identified by the class that declares it along the extends chain of the receiver, so emits and connects through subclasses meet. scene `[connection]` entries resolve the `to` node's script (or the root script of an instanced scene) for the handler and the `from` node's script for the signal.
- the grammar is generated into `internal/gdscript/grammar` (committed, never edited): tree-sitter `v0.25.10` and `PrestonKnopp/tree-sitter-gdscript` at a pinned commit, compiled to wasm with wasi-sdk and binaryen and translated to Go by `wasm2go`, the same pipeline as bonsai's builder. `parser.go` there is the only hand written file. the tree-sitter, grammar and bonsai licenses ship next to it and are embedded, and `oversee licenses` prints them (`gdscript.Notices`).
- tests: `internal/gdscript/testdata/dash-knight` is the story fixture game as a real Godot project (the analyzer tests expect its graph edge for edge, and serving this repo shows it in the flow while it is uncommitted). `internal/service/change_flow_godot_test.go` covers the wiring.
- measured on godot-demo-projects (461 scripts, 396 scenes, 139 projects): 886 call, 154 connect and 60 signal edges in about 0.6s cold, autoload calls 105 of 105 resolved. the story fixture game (`godot-flow-fixture.ts`) comes out edge for edge as written.

## development

- `pnpm dev:server`: runs the go server on port `4400` (falls back to another port when 4400 is busy, then the vite proxy can not reach it) against the test repository (`OVERSEE_DEV_REPO`, defaults to `/Users/omercanbalandi/oaks-lab/storyvine/now-api`). run `oversee init` there once.
- `pnpm dev`: runs vite. it proxies `/api` and `/ws` to the go server (`OVERSEE_DEV_API` overrides the target).
- `pnpm storybook`: storybook with in-memory gateways.
- `pnpm test`: vitest (`vitest.config.ts` merges `vite.config.ts`, so tests get the `@/` alias and the plugins) with two projects, also run alone with `pnpm test:unit` and `pnpm test:storybook`:
    - `unit`: `src/tests/**/*.test.ts` in node, for the `src/lib` classes and the stores.
    - `storybook`: every story rendered in headless chromium through `@storybook/addon-vitest`, plus the `play` interaction tests of stories (`Components/Sidebar/Sidebar` `FlowFilterUnderCollapsedRows`, `FlowStateSurvivesModeSwitch`). run `pnpm exec playwright install chromium` once.
- `pnpm build:ui`: builds the UI shell into a single, gzipped `internal/webui/dist/index.html.gz` (vite `embed` mode, `vite-plugin-singlefile`, inlined diff worker, and the favicon `public/favicon.png` inlined as a data URI by `oversee:inline-favicon`).
- `pnpm build:cli`: `build:ui`, then builds `bin/oversee`.
- `pnpm generate:gdscript`: regenerates `internal/gdscript/grammar` from the pinned grammar, tree-sitter and bonsai commits. it downloads wasi-sdk and binaryen (sha256 pinned for darwin and linux, arm64 and x64) into `~/.cache/oversee/gdscript-grammar` (`OVERSEE_GRAMMAR_CACHE` overrides it) and installs `wasm2go` and `libc-gen` there. the pins live in `scripts/gdscript-grammar.json`.
    - `--update` moves the grammar commit to the head of its branch before generating, and reports newer tree-sitter releases and bonsai tags without moving them: tree-sitter and bonsai move together by hand, because bonsai's builder fixes the tree-sitter version. `--summary <file>` writes a markdown report.
    - `.github/workflows/gdscript-grammar.yml` runs it weekly on linux x64 with the toolchain cache restored by the pins file. it regenerates even when nothing moved, so toolchain drift shows up as a change. when the generated files or the pins changed, it runs `go vet` for `internal/gdscript` and `go test -short` for `internal/gdscript` and `internal/service` and opens a `gdscript-grammar/update` pull request. failing tests are noted in the pull request and fail the run.
- `go test ./internal/...`: the go tests (stdlib `testing`, package internal fakes, temporary git repositories, a fake language server over `net.Pipe` in `internal/service`). `-short` skips `TestChangeFlowWithRealServers`, which runs gopls and typescript-language-server from the app home and skips a server that is not installed.
- `go run ./cmd/catalog-gen`: regenerates `internal/catalog/catalog.json` from `servers.json` and mason (`GITHUB_TOKEN` raises the API rate limit). the coverage summary goes to stdout or `-summary`.
- `../oversee-proto-backend` was the node mock backend of the first phase. the go server replaced it.

## distribution

- distributed over npm, like `esbuild`:
    - `@obsfx/oversee`: a small node shim (`npm/oversee/bin/oversee.js`) with every platform package as an `optionalDependency`.
    - `@obsfx/oversee-<os>-<arch>`: one go binary each, limited by `os` and `cpu`, so npm only installs the one for the current machine.
- platforms: `darwin`, `linux` and `win32` on `arm64` and `x64`, built with `CGO_ENABLED=0`.
- `pnpm build:npm <version>` writes every package into `npm-dist/`. each package lists only `bin` in `files`, so no `.npmignore` is needed. npm adds the copied `LICENSE` (MIT, `license` field too) to every package and `README.md` to `@obsfx/oversee`. `repository` is written as an object, so publish has nothing to auto-correct.
- windows executables carry the eye painting as their icon and the release version in their version info: `cmd/oversee/winres/` holds `winres.json` and the 256px `icon.png` (resized to 256, 64, 48, 32 and 16), and `build:npm` runs `go tool go-winres make` (pinned in the `tool` block of `go.mod`) with the version before the builds. the generated `cmd/oversee/rsrc_windows_<arch>.syso` files are git ignored and only linked into windows builds.
- every release is also a GitHub release with the executables (`oversee-<darwin|linux|windows>-<arm64|x64>`, `.exe` on windows) and a `checksums.txt` of their sha256, created by the manually dispatched `executables` workflow for a pushed tag.
- the `oversee-address` agent skill (`skills/oversee-address/SKILL.md`) walks an agent through `review list`, `start`, `get`, `reply` and `close`. `npx skills add obsfx/oversee` installs it for any agent.
- the version lives in `package.json`. releases run by hand on the maintainer's machine: there is no CD, and CI holds no npm token.

```text
pnpm release <patch|minor|major> [--dry-run]   (scripts/release.mjs)
  → the next version from package.json, a clean working tree, no v<version> tag yet, npm whoami
    → pnpm ci → pnpm build:cli (the UI and bin/oversee) → node scripts/build-npm.mjs <version> (every target)
      → npm publish of the platform packages, then @obsfx/oversee, skipping versions already on the registry (2FA prompts in the terminal)
        → pnpm version <version> → commit package.json as v<version> → annotated tag v<version>
          → prints the next steps: git push --atomic origin HEAD v<version>, gh workflow run executables.yml --field tag=v<version>

executables (manual dispatch with a tag)
  → checkout the tag → pnpm build:npm <tag> → copy the binaries out of npm-dist, win32 named windows, sha256 into checksums.txt
    → GitHub release for the tag (generated notes, assets overwritten on a re-run)
```

- nothing is written before the publish step, so a failed release reruns with the same bump: the version comes out the same and the published packages are skipped. `--dry-run` runs everything with `npm publish --dry-run`, accepts a dirty working tree and stops before the version, commit and tag.

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
- side effects that react to service or store changes (syncing, document title) are lib classes with `start(): () => void`, composed by `ReviewSync` and mounted by one hook. components and layouts do not subscribe to state they do not render, and lib reaches app stores only through small ports declared by the class that uses them.
- when styling components with tailwind, use `/Users/omercanbalandi/studio-2/oversee/src/c.ts` for long or conditional class names.
- state management is `zustand`. stores live in `./src/store`.
- react contexts live in `./src/context/<name>/`, together with their provider and the hook that consumes them.
- prefer `interface` over `type` for object shapes.
- if https://usehooks.com/ (`@uidotdev/usehooks`) already provides a hook, use it instead of writing one from scratch.
- never add hard limits to lists to protect rendering performance. render everything and use virtual lists (`@tanstack/react-virtual`) when needed.
- never use unicode symbols such as `…`, `·`, `→` in source text. use plain text, or an icon from `react-icons` for symbols.
- use `plur` for count based pluralization.
- always use curly braces for `if` bodies and arrow function bodies.
- never give a function, class or class member a name that only differs by letter case from another one in the same module or class (`withDataDir` next to `WithDataDir`). eslint enforces it (`oversee/distinct-names`).
- text filters (trim, lowercase, substring) go through `TextQueries`.
- a hook that loads one async value per key uses `useKeyedPromise({key, load})`: it shows loading until the result for the current key lands and drops results of an old key. thrown values become `Error`s through `Errors.of`.
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
- generated code is never edited: `internal/storage/sqlite/sqldb` (`pnpm generate:sql`) and `internal/gdscript/grammar` (`pnpm generate:gdscript`).
- database access goes through `sqlc`: queries live in `internal/storage/sqlite/query`, generated code in `internal/storage/sqlite/sqldb` (committed, never edited). run `pnpm generate:sql` after changing queries or migrations.
- schema changes are new files in `internal/storage/sqlite/migrations`, tracked with `PRAGMA user_version`. never edit an existing migration, user databases already ran it.
- put logic in receiver methods on the type that owns it (domain entities, git output types, presenters), and orchestrate those calls in services.
- a package-level function never shares its name with another function or method of its package when letter case is ignored (`withDataDir` next to `Run.WithDataDir`). methods of different types may share a name. `internal/lint` checks it in `go test ./internal/...`, test files included.

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
- `./src/tests`: vitest unit tests, mirroring the source folders (`lib`, `store`). never place tests next to the code. interaction tests are `play` functions on stories.

##### go
- `./cmd/oversee`: the binary entry point, calls `transport/cli`.
- `./cmd/catalog-gen`: generates the embedded language server catalog.
- `./internal/app`: composition root, wires workspace, database, repositories, services and the http server.
- `./internal/domain`: entities, value objects, rules, domain events and errors.
- `./internal/service`: `DiffService`, `CommentService`, `ReviewService`, `NotificationService`, `SettingsService`, `EventFeed`, `WorkspaceWatcher`, `LanguageServerService`, `DefinitionService` (definitions and the file content of read-only tabs), `ChangeFlowService` (the change flow and its progress signal).
- `./internal/lsp`: JSON-RPC connection, LSP client and session pool.
- `./internal/lsp/lsptest`: helpers for fake language servers in the lsp and service tests: `PipeTransport` (an lsp transport over net.Pipe), `Connect` (serves a fake on the other end), `Frame`, `WriteFrame` and `ReadFrame` (Content-Length frames).
- `./internal/catalog`: the embedded language server catalog (`catalog.json`) and its validation.
- `./internal/cataloggen`: catalog generation from `servers.json` and mason-registry.
- `./internal/langserver`: app home, platform detection, toolchain lookup, installer, installations, launcher, process and project files.
- `./internal/gdscript`: GDScript facts, the Godot project model, call resolution and the analyzer. `./internal/gdscript/grammar` is the generated parser (`pnpm generate:gdscript`).
- `./internal/repository`: session, comment, reply, notification, settings and event repositories, `TxRunner`.
- `./internal/storage/sqlite`: database open, migrations, sqlc config, queries and generated `sqldb` code, change detector.
- `./internal/git`: git runner, output parsers and repository.
- `./internal/transport/httpapi`: http handlers per resource, error mapping, index page rendering, localhost guard.
- `./internal/transport/ws`: websocket hub.
- `./internal/transport/cli`: cobra commands (`init`, `serve`, `review`) and presenters.
- `./internal/transport/dto`: the JSON contract and its mappings.
- `./internal/workspace`: resolves the `.oversee` directory and the git root.
- `./internal/lint`: repository checks that run as tests (distinct function names).
- `./internal/webui`: the embedded UI shell (`dist/index.html.gz`, built by `pnpm build:ui`).
- `./npm`, `./scripts`: npm shim and package build script.
- `./skills`: the agent skills, installed with `npx skills add obsfx/oversee`.
