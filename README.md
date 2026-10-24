# My Code Office

**Your Claude Code conversations as a pixel-art office.** Each desk is a conversation. At a glance you see who is waiting for you, who is done, who is in a meeting with subagents, and which repo and branch each one is touching.

> 🇧🇷 O painel e a configuração também falam português: seguem o idioma do VS Code, ou escolha em `myCodeOffice.idioma`. Este README em português: `README.pt-BR.md` no repositório.

<!-- Main screenshot: added once the public repository exists (vsce needs the "repository" field for images). -->

## Who it's for

People who run several Claude Code conversations at once and lose track of which one stopped to ask for permission, which one is done, and which one touched the wrong branch.

## Getting started

1. Install the extension and open the **Office** tab in the bottom panel (where Terminal and Problems live).
2. In a Claude Code conversation, type **`/my-code-office`**. It's a ~3-minute interview: language, your name, the repos you want to follow and your team's test environments. Nothing is saved until you see the summary and confirm, and everything it changes is backed up first.
3. That's it. Your conversations show up at the desks on their own.

To change your answers later, run `/my-code-office` again.

## What you see

| In the office | Means |
|---|---|
| Raised hand, yellow `!` bubble | The conversation is waiting for you: a permission or an answer |
| Coffee, green `✓` bubble | Done: there's a result to read |
| Typing, `…` bubble | Thinking or running tools |
| Meeting room | The conversation called subagents. It sits at the head of the table with a star; the subagents sit along the sides |
| `z` napping | No activity for over an hour |
| Dark circles and sweat | The conversation's context is large: time to start a new one |
| Papers on the desk | Your unpushed commits in that conversation's repo |
| Red lightning between desks | Two conversations in the same repo and the branch changed under one of them: risk of committing to the wrong branch |
| Rug with a name | Conversations in the same repo sit together, on that repo's rug |
| DEV / TST / HMG rooms | Who has each of the team's test environments |
| Mailbox | Total unpushed commits |

In a short panel, the office fills the width and scrolls; a minimap in the corner shows the whole office and takes you anywhere with a click. The − + ⤢ buttons (or Ctrl + mouse wheel) zoom out, in, or show the whole office.

Hover over a desk to see the branch and the last request. Click it for the details: what you asked, what Claude answered, the repos it edited, and a button that copies the command to resume the conversation.

## More things it does

- **Search a topic.** The box at the top searches every conversation on the machine, not just titles, ignoring accents and case. Desks that talked about it light up, and the list includes old conversations that already left the office. In chat, the `/conversation` skill does the same: "what was the last conversation about X?".
- **Notice board.** Things that can't be forgotten ("run the migration before prod"). Check them off right in the panel, or from any conversation with the `/notice` skill: "put X on the board", "mark the Y notice as done".
- **Test environments.** If your team shares dev, tst and hmg by word of mouth, the `/branches` skill records who has each one, and the rooms show it. It also lists what's unpushed on your branches.
- **Remove from office.** A conversation left behind (for example, one opened in the background by another extension) goes away with one click and comes back by itself if it has new activity.

## Live status

In the interview, the question "show when a conversation is waiting for your approval?" turns on live status: Claude Code notifies the panel at each step of your conversations. Without it, the panel infers the state from the conversation history, a few seconds late, and can't tell when a conversation is waiting for permission. Requires Node.js. To turn it off, run `/my-code-office` again.

## Settings

| Setting | Default | What for |
|---|---|---|
| `myCodeOffice.idioma` | `auto` | `pt-BR`, `en` or the VS Code language |
| `myCodeOffice.arranjo` | `fileiras` | `fileiras` (rows, one rug per repo) or `ilhas` (pods of 4) |
| `myCodeOffice.horasVisiveis` | `12` | Conversations idle for longer leave the office |
| `myCodeOffice.minutosCochilo` | `60` | Idle minutes before napping |
| `myCodeOffice.tokensCansado` | `400000` | Context size from which the worker looks tired |
| `myCodeOffice.arquivoAmbientes` | `~/.claude/branches/estado.md` | Test environments table (kept by `/branches`) |
| `myCodeOffice.arquivoAvisos` | `~/.claude/my-code-office/avisos.md` | Notice board items, one per line: `- [ ] text` |

Commands (Ctrl+Shift+P): **My Code Office: Open panel**, **Refresh now** and **Set up**.

## Privacy

Everything stays on your machine. The panel reads Claude Code's history in `~/.claude/projects` and the git data of your repos, and sends nothing anywhere. It never pushes or fetches.

## Requirements and limits

- VS Code 1.90 or newer, with Claude Code installed.
- Node.js, only for live status.
- Tested on Windows.

## Undo

The interview backs up everything it changes in `~/.claude/my-code-office/backups/` and, at the end, shows the command to restore it. To leave for good: run `/my-code-office` and answer "no" to live status (this removes the Claude Code notifications), then uninstall the extension from the Extensions view. The `/branches` and `/conversation` skills keep working on their own; delete their folders in `~/.claude/skills/` if you no longer want them.

For development, see `CONTRIBUTING.md` in the repository.
