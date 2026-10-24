---
name: my-code-office
description: Setup interview for My Code Office (VS Code extension) — asks name, repos, the team's shared test environments, live status (hooks) and preferences, and generates the /branches, /conversation and /notice skills, the environments table, the notice board and the panel settings. Use when the person types /my-code-office, asks to set up or reconfigure My Code Office (the conversations office), or says they just installed the extension.
---

# /my-code-office

You will interview the person to set up My Code Office, the pixel-art office of their Claude Code
conversations. Warm and direct tone, in English. Ask as little as possible: **detect first** whatever
you can and only confirm.

## 0. Opening (one short message)

In 2 or 3 sentences: what will be set up; that it takes about 3 minutes; that **nothing is saved
before they see the summary and confirm**; and that everything gets an automatic backup, with a command to undo.

## 1. Detect (don't ask anything yet)

```bash
node "{{APLICAR}}" --detectar
```

Returns JSON with: git name and e-mail, repos found (path, main branch, their last commit, whether it
has a remote), previous setup (if this is not the first time), existing skills, hooks status, Node
version and `idiomaSugerido` (system language). If `anterior` is filled, this is a **reconfiguration**:
show the previous answers and ask only what they want to change.

## 2. Ask (AskUserQuestion, at most 4 questions per round)

**Clarity rules (the question window covers the conversation text):**
- Every question must explain itself. Never write "listed above", "as said before" or "the N
  recommended" without showing which. Whatever the person needs to decide goes **inside** the
  question: in the options or their descriptions.
- Title and options in everyday language, by the **practical effect** ("show when a conversation is
  waiting for your approval"), never by the mechanism ("hooks", "settings.json", "fetch", "transcripts").
  Technical detail, if useful, goes in the option description, after the effect.
- The `header` (short tag) has no jargon either: "Approvals", not "Hooks".

**Round 0, language** (only the first time, or if asked to change): header "Language". "Which language
do you want for the panel and the generated skills?" Options: "English" and "Português (Brasil)", with the
system language (`idiomaSugerido`) marked as recommended. If they pick Português, continue the interview in
Portuguese from then on. Save it as `idioma` ("en" or "pt-BR").

**Round 1, you:**
- What to call the person (options: the git name and the first name; "Other" to type).
- How the panel names the coordinator's queue: by name ("Ana's queue"), "Manager's queue", or just "Queue".
  Save the final title in `tituloFila`.
- A nickname for Claude, used as a trigger for the skills (e.g. "jarvis, how are my branches?").
  Options: "No nickname", "Jarvis"; "Other" to type.

**Round 2, repos (the repos themselves are the options):** use `multiSelect: true` and make each repo a
checkable option: `label` = repo name; `description` = "your last commit on MM/DD · main branch X" (or
"no commits from you", "no remote: the work only exists on this machine"). Group them into up to 4
questions of up to 4 options, each with a clear title, in this order:
1. "Repos with your commits in the last 30 days (check the ones to follow)": most recent first.
2. If any are left, "More repos with recent commits".
3. "Idle repos (no commits from you in 30+ days): follow any?"
If there are more repos than fit, say in the last option's description that others can be typed in
"Other". If no repo was detected, ask for the folder where they live and run `--detectar --pasta "<folder>"`.
On reconfiguration, add "(followed today)" to the description of those already in the list.

**Round 3, team and environments:**
- Shared test environments (at most 4; they become rooms in the office): "dev, staging and prod-like",
  "dev and staging", "We don't share environments"; "Other" to type them separated by commas.
- How the team agrees on who uses each environment: "Verbally", "Spreadsheet or board", "Chat channel", "We don't".
- How many people share these environments: "2 to 3", "4 to 6", "7 or more".

**Round 4, behavior:**
- header "Approvals". Question: "Should the panel show when a conversation is waiting for your approval
  to continue?" Options:
  - "Yes, show it (recommended)": "It also shows right away who finished, who is in a meeting with
    subagents and which repo each conversation is working on. For that, Claude Code notifies the panel
    at each step of the conversations (it lives in Claude Code's settings, with a backup). You can turn it off later."
  - "No, just the basics": "The panel infers the status from the conversations' history, a few seconds
    late, and doesn't show approval requests."
  If `node` was not detected, don't offer "Yes": explain that Node.js is required.
- header "Server". Question: "Before the branches report, may I fetch what changed on the server
  (git fetch)?" Options: "No, I'll update it myself": "Good if your Git key asks for a password; the report
  warns when the server info is stale." / "Yes, go ahead": "It only fetches; it never sends anything (push)."
- header "Desks". "How should the desks be arranged in the office?": "In rows, with a rug per repo
  (recommended)": "More room; desks from the same repo share a rug with its name" / "In pods of 4 per
  repo": "More grouped, more cramped".
- header "Notices". "Want to start the notice board with any pending item?" (e.g. "run migration X
  before prod"): "Not now" / "Yes, I'll type them": "Write them in Other, one per line".

## 3. Summary and confirmation

Save the answers to `~/.claude/my-code-office/respostas.json` (format below — keys stay in Portuguese,
they are internal) and show a summary table: what will be **created**, what will be **replaced** and what
**doesn't change**. Ask: "Apply", "I want to adjust something", "Cancel". Only proceed with "Apply".
Since the question window covers the table, the **description** of "Apply" repeats the essentials in
one line (e.g. "Creates /branches with 11 repos, /conversation and /notice; rooms dev/staging; shows approvals;
2 new notices. Backs up first."), and the question reminds them they can collapse the window (arrow in
the corner) to see the full summary.

```json
{
  "idioma": "en", "nome": "Ana", "tratamento": "nome", "tituloFila": "Ana's queue", "apelido": "jarvis",
  "repos": ["C:/path/repo-a", "C:/path/repo-b"],
  "ambientes": ["dev", "staging"], "combinado": "verbally", "tamanhoTime": "4 to 6",
  "hooks": true, "podeFetch": false, "arranjo": "fileiras",
  "avisos": ["Run migration X before prod"]
}
```
(`arranjo` is "fileiras" for rows or "ilhas" for pods.)

## 4. Apply

```bash
node "{{APLICAR}}" "~/.claude/my-code-office/respostas.json"
```

The script backs up everything it will touch, generates the files and prints what it did and the backup folder.
Finish by saying:
- what was created (`/branches`, `/conversation` and `/notice` skills, environments table, notices, settings);
- that they need to run **Developer: Reload Window** in VS Code for the panel to read the settings;
- if hooks were turned on, that they apply from the conversations' next event;
- **how to undo**: `node "{{APLICAR}}" --restaurar "<backup folder>"`;
- that they can run `/my-code-office` again anytime to change answers.

Never edit `settings.json`, skills or the environments table by hand during the interview: everything goes
through the script, which is what makes the backup.
