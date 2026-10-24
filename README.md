
# oversee

<img src="https://raw.githubusercontent.com/obsfx/oversee/refs/heads/assets/oversee.png" alt="oversee" width="200"/>

## What is this tool about?

<img src="https://raw.githubusercontent.com/obsfx/oversee/refs/heads/assets/Screenshot%202026-10-24%20at%2003.09.55.png" alt="oversee" />

As of October 2026, when I'm writing this README, after using Opus 5.5, I've become convinced that writing code manually has largely become an old-fashioned practice. These tools are faster than us and sometimes even smarter. They can go through an entire codebase using bash tools much faster than we can by manually reading code, and on top of that, they can complete well-specified tasks in much less time. It's not hard to see this from the work I've done over almost the last year.

However, as a human, I still want to stay in the loop while developing tasks and products delegated to agents, especially at points where human intervention is still needed. The biggest reason for this is the concept of [**Cognitive Debt**, which Simon Willison](https://simonwillison.net/2026/Feb/15/cognitive-debt/) also talks about. I've noticed that if things get out of hand and I no longer understand what's going on under the hood, even at a high level, I start having difficulty making decisions about the product's next steps and future. Also, not correcting an agent at an early stage can lead to much bigger problems, like a snowball effect. One thing is certain: I used to experience these problems much more frequently with earlier versions of Opus with 200k context windows, and things are much better now. Still, I feel the need to read the output to avoid `Cognitive Debt`.

That's exactly what **oversee** is for. What it does is very simple: it basically brings the GitHub PR experience to your local environment. Through a web-based UI, you can add **comments**, complete your **review**, and pass it to your agent through its CLI. This tool came out of my desire to have the same PR experience you'd have with a coworker, but locally, before pushing any code.

**oversee** is a diff viewer and line annotation tool. I also refer to it as a **Human Intervention Interface**. It's written in Go and React. The UI is embedded into the Go binary. It also has LSP support for a few languages.

## Installation

1. You can install **oversee** globally through npm.

```
npm i -g @obsfx/oversee
```

2. Or you can download standalone executables from the `releases` section.

### Platform notes

- **Windows PowerShell:** PowerShell's default execution policy blocks the `oversee.ps1` launcher that npm creates, with `running scripts is disabled on this system`. This happens to every npm CLI on Windows. Run `oversee` from `cmd`, call `oversee.cmd` from PowerShell, or allow local scripts for your user:

```
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

- **macOS executables:** the macOS executables in `releases` are not notarized, so Gatekeeper blocks one that was downloaded through a browser. Remove the quarantine flag and make it executable before running it. npm installs and downloads with `curl` or `gh` are not affected.

```
xattr -d com.apple.quarantine ./oversee-darwin-arm64
chmod +x ./oversee-darwin-arm64
```

## How to Use

1. Run `oversee init` in the codebase where you want to use it. This command will create a `.oversee` directory where we store the review data. For persistence, the entire history is saved in a SQLite database inside this directory.
2. Then run `oversee serve` to start the UI.
3. After adding your comments, all you need to do is tell your agent that you have comments in `oversee`. Your agent is smart enough to figure out the rest.

**But to make things easier, you can install the oversee skill.**

```
npx skills add obsfx/oversee
```

Then use the `/oversee-address` skill inside your agent, and it will take care of the rest.

## Features

<table>
  <tr>
    <th>Feature</th>
    <th>Preview</th>
  </tr>
  <tr>
    <td valign="top" width="40%">
      <b>Comment on lines</b>
      <br><br>
      Select a line or a range of lines in the diff and write your comment in markdown. The comment keeps a copy of the lines it points at, so it still makes sense after the code changes.
    </td>
    <td>
      <img src="https://raw.githubusercontent.com/obsfx/oversee/refs/heads/assets/comment.png" alt="Writing a comment on lines 22-26 of a diff" width="500" />
    </td>
  </tr>
  <tr>
    <td valign="top" width="40%">
      <b>Finish the review</b>
      <br><br>
      When you are done, finish the review. Its comments move into a review session that your agent can pick up.
    </td>
    <td>
      <img src="https://raw.githubusercontent.com/obsfx/oversee/refs/heads/assets/finish-review.png" alt="Finish review confirmation" width="346" />
    </td>
  </tr>
  <tr>
    <td valign="top" width="40%">
      <b>Your agent takes it from there</b>
      <br><br>
      The agent works through the CLI: it lists the finished reviews, reads the comments with their saved code, fixes what needs fixing, replies to questions and updates the review status.
    </td>
    <td>
      <img src="https://raw.githubusercontent.com/obsfx/oversee/refs/heads/assets/agent-cli.png" alt="An agent running oversee review list, start, get, reply and close" width="500" />
    </td>
  </tr>
  <tr>
    <td valign="top" width="40%">
      <b>Follow up in the UI</b>
      <br><br>
      Status changes and replies show up as notifications, even the ones that happened while the UI was closed. Replies sit under the comment they answer, inside the review session.
    </td>
    <td>
      <img src="https://raw.githubusercontent.com/obsfx/oversee/refs/heads/assets/notifications.png" alt="Notifications for a closed review, an agent reply and a review in progress" width="500" />
      <img src="https://raw.githubusercontent.com/obsfx/oversee/refs/heads/assets/agent-reply.png" alt="A finished review session with an agent reply under a comment" width="500" />
    </td>
  </tr>
  <tr>
    <td valign="top" width="40%">
      <b>Go to definition</b>
      <br><br>
      Hold <code>Cmd</code> (<code>Ctrl</code> on Windows and Linux) over a symbol to see its definition, and click it to open the file in a tab. Language servers are installed on demand from the settings.
    </td>
    <td>
      <img src="https://raw.githubusercontent.com/obsfx/oversee/refs/heads/assets/go-to-definition.png" alt="Definition popover for bytesPerSecond" width="500" />
    </td>
  </tr>
  <tr>
    <td valign="top" width="40%">
      <b>Call flow</b>
      <br><br>
      The <code>Call flow</code> mode of the sidebar shows the changed functions as a call tree, so you can read a change in the order it runs. Clicking a function opens the line where it is called.
    </td>
    <td>
      <img src="https://raw.githubusercontent.com/obsfx/oversee/refs/heads/assets/call-stack.png" alt="Call flow sidebar next to the diff, showing estimateRemainingMs at its call site" width="500" />
    </td>
  </tr>
</table>
