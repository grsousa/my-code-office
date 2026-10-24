// Liga/desliga os hooks do My Code Office no ~/.claude/settings.json, com backup antes de cada gravação.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");

const ARQUIVO = path.join(os.homedir(), ".claude", "settings.json");
const EVENTOS = ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Notification", "Stop", "SubagentStop", "SessionEnd"];
const COM_MATCHER = new Set(["PreToolUse", "PostToolUse"]);
// Reconhece o hook em qualquer lugar: cópia fixa em ~/.claude/my-code-office/hooks, pasta do projeto,
// ou os caminhos do nome antigo (escritorio), para a troca de nome não deixar hook duplicado.
const NOSSO = /(my-code-office|escritorio)[^"]*registrar\.js/;

function ler() {
  return fs.existsSync(ARQUIVO) ? JSON.parse(fs.readFileSync(ARQUIVO, "utf8")) : {};
}

function gravar(config) {
  if (fs.existsSync(ARQUIVO)) fs.copyFileSync(ARQUIVO, `${ARQUIVO}.antes-my-code-office-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, `${JSON.stringify(config, null, 2)}\n`);
}

const ehNosso = (hook) => typeof hook.command === "string" && NOSSO.test(hook.command.replace(/\\/g, "/"));

function semOsNossos(config) {
  for (const evento of Object.keys(config.hooks || {})) {
    config.hooks[evento] = config.hooks[evento]
      .map((grupo) => ({ ...grupo, hooks: (grupo.hooks || []).filter((h) => !ehNosso(h)) }))
      .filter((grupo) => grupo.hooks.length);
    if (!config.hooks[evento].length) delete config.hooks[evento];
  }
  if (config.hooks && !Object.keys(config.hooks).length) delete config.hooks;
  return config;
}

function instalar(script) {
  const config = semOsNossos(ler());
  const comando = `node "${script.replace(/\\/g, "/")}"`;
  config.hooks = config.hooks || {};
  for (const evento of EVENTOS) {
    const grupo = { hooks: [{ type: "command", command: comando, timeout: 5 }] };
    if (COM_MATCHER.has(evento)) grupo.matcher = "*";
    config.hooks[evento] = [...(config.hooks[evento] || []), grupo];
  }
  gravar(config);
}

function remover() {
  const config = ler();
  const tinha = JSON.stringify(config).match(NOSSO);
  if (tinha) gravar(semOsNossos(config));
}

function status() {
  const config = ler();
  return EVENTOS.filter((e) => ((config.hooks || {})[e] || []).some((g) => (g.hooks || []).some(ehNosso)));
}

module.exports = { instalar, remover, status, ARQUIVO };
