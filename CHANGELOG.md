# Changelog

## 0.9.0 — first public preview

- Settings renamed to English: `myCodeOffice.language`, `layout` (`rows` / `pods`), `visibleHours`, `napMinutes`, `tiredTokens`, `environmentsFile`, `noticesFile`. The old names keep working.
- Extension icon, screenshot and "Preview" flag for the Marketplace.
- Long environment names no longer run into the text next to them.

## 0.8

- `/aviso` / `/notice` skill: create, list and check off notices from any conversation.
- Collapsible side sections (queue, environments, notice board, mailbox), each with a one-line summary when closed.
- Mailbox counts every repo you follow, one line per repo; ignore a branch or a whole repo (shared with `/branches`).
- Commits made from the terminal (`git commit`, merge, cherry-pick…) count as editing the repo.
- Zoom in 20% steps, full-width view with a minimap for short panels.
- "Remove from office" for conversations left behind, and a hint for conversations opened in the background by other extensions.
- Updating the extension also updates the hook and tools copied to `~/.claude`.
- Portuguese and English, following the VS Code language or `myCodeOffice.language`.
- Renamed from "Escritório das Conversas"; settings and data are moved automatically.

## 0.7

- Setup interview (`/my-code-office`) that generates the skills, the environments table, the notice board and the settings, with backup and undo.

## 0.6

- Search a topic across all conversations, in the panel and with the `/conversa` skill.
- Meeting room for subagents, with the host at the head of the table.
- Notice board with checkboxes, rows of desks with a rug per repo, multi-repo conversations.
