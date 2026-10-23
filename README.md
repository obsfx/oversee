
# oversee

<img src="https://raw.githubusercontent.com/obsfx/oversee/refs/heads/assets/oversee.png" alt="oversee" width="200"/>

## What is this tool about?

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

## How to Use

1. Run `oversee init` in the codebase where you want to use it. This command will create a `.oversee` directory where we store the review data. For persistence, the entire history is saved in a SQLite database inside this directory.
2. Then run `oversee serve` to start the UI.
3. After adding your comments, all you need to do is tell your agent that you have comments in `oversee`. Your agent is smart enough to figure out the rest.

**But to make things easier, you can install the oversee skill.**

```
npx skills add obsfx/oversee
```

Then use the `/oversee-address` skill inside your agent, and it will take care of the rest.