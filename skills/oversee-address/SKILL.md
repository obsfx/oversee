---
name: oversee-address
description: Pick up finished oversee code reviews and address their comments. Use when the user asks to address, handle or work through oversee review comments, or runs /oversee-address. Reads review sessions with the oversee CLI, changes the code, replies to questions and updates each session's status.
argument-hint: "[session-id]"
---

# Address oversee reviews

oversee is a local diff viewer. A reviewer leaves line comments on a git comparison and finishes them as a **review session**. This skill reads those sessions with the `oversee` CLI, makes the requested changes and reports back through the session status and comment replies. The reviewer sees every status change and reply in the oversee UI.

## Setup

- Use `oversee` when it is on PATH, otherwise `npx -y @obsfx/oversee`.
- Run the commands from the folder where `oversee init` was run (the one holding `.oversee/`), or pass `-C <dir>`. `oversee is not initialized here` means the wrong folder: look for the `.oversee` folder or ask the user.

## Workflow

1. **Pick the sessions.**
   - A session id was passed: address only that session.
   - Otherwise run `oversee review list --json` and take every session whose `status` is `created`, oldest first. Use `--page` when `total` is larger than the page.
   - Leave `in-progress` and `closed` sessions alone unless the user names them.
   - Nothing to address: say so and stop.
2. **Check where the code lives.** `source` `:uncommitted` is the working tree. Any other `source` is a branch that must be checked out. When it is not, ask the user before switching branches.
3. **Start it.** `oversee review start <session-id>` marks the session `in-progress`.
4. **Read it.** `oversee review get <session-id> --json` returns the comments:
   - `id`, `filePath` and `body`, the reviewer's request in markdown.
   - `range`: `start` and `end` lines, `side` and `endSide` are `additions` (new code) or `deletions` (removed code).
   - `lines`: the code the reviewer saw, with its line numbers. The file may have changed since, so find the code by its text, not only by its line numbers.
   - `outdatedAt`: not `0` when the commented code changed before the review was finished. Check that the comment still applies before acting on it.
   - `replies`: earlier answers. Do not answer the same thing twice.
5. **Address each comment.**
   - A change request: make the change, scoped to what the comment asks and in the style of the surrounding code.
   - A question, a comment that needs no change, or a request you disagree with or can not do: reply instead of changing code.
     ```bash
     oversee review reply <comment-id> --body "..."
     ```
     Replies render as markdown. For a multi-line reply, omit `--body` and pass the text on stdin.
   - A change that differs from what was asked: make it and reply with what was done and why.
   - A comment that is unclear, where a wrong guess would be costly: ask the user.
6. **Verify** the changes the way the project does (tests, type checks, linters) when it is relevant.
7. **Close it.** `oversee review close <session-id>` once every comment is changed or answered. When something is still open, leave the session `in-progress` and say what is left.
8. **Report** per session: what changed for which comment, what got a reply, and what is left.

## Rules

- Do not commit, push or open pull requests unless the user asked for it.
- Never edit `.oversee/` or its database directly. The CLI is the only writer.
- Keep replies short and specific, the reviewer gets a notification for each one.
