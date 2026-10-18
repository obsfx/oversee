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
  → pick an available port on 127.0.0.1
    → HTTP mux (localhost hosts only)
      → GET /        → embedded index.html.gz + injected window.__overseeGlobal
      → /api/*       → httpapi handler → service → git.Repository | repositories (sqlite)
      → GET /ws      → ws.Hub
        → service.EventFeed (PRAGMA data_version check every 100ms on the events table)
          → broadcast new events to every connected UI

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
- services declare the small interfaces they consume (`GitReader`, `Transactor`, `ChangeDetector`); repositories and the git repository are concrete structs.
- every multi-write runs in `TxRunner.Within`, and its events are appended in the same transaction (outbox).
- the JSON contract lives only in `internal/transport/dto`: HTTP responses, CLI `--json`, event payloads (`dto.EventCodec`) and the websocket envelope. changing it means changing the UI parsers too.
- errors: `domain.ValidationError` maps to 400, `domain.ErrNotFound`/`ErrNoOpenSession` to 404, session state conflicts to 409, everything else to 500 and a log line.

- **HTTP** carries queries and commands. the **websocket** only pushes server events to the UI.
- every write appends a row to the `events` table in the same transaction. this lets CLI processes reach a running server without knowing its port, and lets a reconnecting UI replay missed events with `?after=<lastEventId>`.
- `window.__overseeGlobal` holds `baseUrl`, `wsUrl` and `workspace` (folder `name`, `path`, and `repoName` when served from a repo subdirectory). without it (vite dev server, storybook), the UI falls back to `window.location` and `GET /api/workspace`.

## CLI interface

- `oversee init`: creates the `.oversee` directory inside the `cwd` and the `sqlite` database in it. it also adds `.oversee/` to `.git/info/exclude`, so it never shows up as an untracked change.
- `oversee serve`: picks an available port and serves the UI shell and the backend on the same address.
    - `--port` fixes the port, `--open` opens the browser, `--dev` accepts websocket connections from local dev servers.
- `oversee review list`: lists finished review sessions, newest first, paginated with `--page` and `--limit`.
- `oversee review get <session-id>`: shows all details of a session: comments, saved code lines and replies.
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

##### topbar
- a button that toggles the **sidebar**. it is an icon button that reflects the `expanded` or `collapsed` state with the proper icon.
- the **workspace breadcrumb**: the served folder name (`repo / folder` inside a subdirectory), then a slash, then the branch selection. the full path shows in a tooltip. the document title is `<folder> - oversee`.
- the **branch selection**: source and target branch, plus an option for viewing uncommitted changes.
    - the initial selection is `Uncommitted changes` against `main` (falling back to `master`, `develop`, then the current branch).
    - uncommitted changes always diff the working tree against `HEAD`. the target only matters for branch comparisons, where the diff runs from the merge base (or the target itself when the branches share no history).
- a `finish review` button, see **review sessions**.
- a **comments** button with a popover. it shows the comment count, see **review sessions**.
- a **notifications** button with a popover, see **notifications**.
- a settings button and its menu:
    - theme selection, light or dark.
    - font selection for the UI and the editor, powered by google fonts.

##### toolbar
- file navigation: `[prevButton] {currentFileNumber} / {totalFileNumber} [nextButton]`, for example `[<] 4 / 72 [>]`.
- side-by-side and unified view toggle.
- total difference count of the file.
- `expand/collapse unchanged sections` button.

##### diff viewer
- powered by `@pierre/diffs`. install its skill for a better understanding of the tool: `npx skills add https://github.com/pierrecomputer/pierre --skill diffs`.
- shows `1 file at a time`.
- lines and line selections can be annotated. an annotation is sent to the backend and saved to the database.
- opening a file diff shows its comments, fetched from the backend.
- shows a loader while the diff is loading.

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
- agents reply to comments with `oversee review reply`. replies show as an always visible thread under their comment in the session detail.

##### comments popover
- the topbar `comments` button opens a tabbed popover:
    - `Current`: comments of the open session. clicking one navigates to its file and scrolls to its line.
    - `Sessions`: finished sessions of the current comparison, newest first. each row shows the status icon, finish date, branch and comment count.
- selecting a session drills into it inside the same popover (with a back button). each comment shows its file, line range, the saved code lines with **syntax highlighting** (same theme as the diff view), the comment text and its replies.

##### how it works
- `ReviewSessionGateway` (http, and in-memory for stories) and the `ReviewSessions` class own the data. finishing updates the session list and clears the active comments. `ReviewSessions.session(id)` loads a single session from any comparison.
- `useFinishReview`, `useReviewSessions`, `useReviewSession`, `useCommentsMenu` and `useSnippetHighlight` drive the UI. `SnippetHighlighter` tokenizes saved lines with the shared `@pierre/diffs` highlighter.

## notifications

- agent actions (`review start`, `review close`, `review reply`) create **persisted** notifications with a read state, so things that happened while the UI was closed still show up.
- the topbar bell shows the unread count. its popover lists notifications newest first, with a `Mark all read` action.
- clicking a notification marks it read and drills into its review session inside the same popover, even when the session belongs to another comparison.
- `NotificationGateway` (http and in-memory) and the `Notifications` class own the data. `useNotifications` and `useNotificationsMenu` drive the UI.

##### server events
- `EventStream` is the push gateway: `SocketEventStream` in the app, `InMemoryEventStream` in stories.
- `ServerEvents` validates incoming envelopes at the boundary. `ServerEventSync` applies them to the services, mounted by `useServerEventSync` in the review layout.
- event kinds: `session.finished`, `session.status`, `comment.replied`, `notification.created`, `notifications.read`. session events silently refresh the cached session lists, without showing a loader.

## development

- `pnpm dev:server`: runs the go server on port `4400` against the test repository (`OVERSEE_DEV_REPO`, defaults to `/Users/omercanbalandi/oaks-lab/storyvine/now-api`). run `oversee init` there once.
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
- validate external data (http responses, socket messages, injected globals) at the boundary, in the gateway or parser classes.

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
- `./internal/service`: `DiffService`, `CommentService`, `ReviewService`, `NotificationService`, `EventFeed`.
- `./internal/repository`: session, comment, reply, notification and event repositories, `TxRunner`.
- `./internal/storage/sqlite`: database open, migrations, sqlc config, queries and generated `sqldb` code, change detector.
- `./internal/git`: git runner, output parsers and repository.
- `./internal/transport/httpapi`: http handlers per resource, error mapping, index page rendering, localhost guard.
- `./internal/transport/ws`: websocket hub.
- `./internal/transport/cli`: cobra commands (`init`, `serve`, `review`) and presenters.
- `./internal/transport/dto`: the JSON contract and its mappings.
- `./internal/workspace`: resolves the `.oversee` directory and the git root.
- `./internal/webui`: the embedded UI shell (`dist/index.html.gz`, built by `pnpm build:ui`).
- `./npm`, `./scripts`: npm shim and package build script.
