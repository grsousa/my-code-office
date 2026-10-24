// Onde o My Code Office guarda tudo na máquina. O hook (hooks/registrar.js) repete a pasta de sessões
// porque roda sozinho, copiado para fora da extensão.
"use strict";
const os = require("os");
const path = require("path");

const CLAUDE = path.join(os.homedir(), ".claude");
const PASTA = path.join(CLAUDE, "my-code-office");

module.exports = {
  CLAUDE,
  PASTA,
  PASTA_ANTIGA: path.join(CLAUDE, "escritorio"),   // nome antigo (Escritório das Conversas), migrado na ativação
  SESSOES: path.join(PASTA, "sessoes"),
  CONFIG: path.join(PASTA, "config.json"),
  RESPOSTAS: path.join(PASTA, "respostas.json"),
  AVISOS: path.join(PASTA, "avisos.md"),
  DISPENSADAS: path.join(PASTA, "dispensadas.json"),
  BACKUPS: path.join(PASTA, "backups"),
  FERRAMENTAS: path.join(PASTA, "ferramentas"),
  HOOK: path.join(PASTA, "hooks", "registrar.js"),
  ESTADO_BRANCHES: path.join(CLAUDE, "branches", "estado.md"),
  SKILLS: path.join(CLAUDE, "skills"),
};
