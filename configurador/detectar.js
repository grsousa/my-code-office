// Detecção para a entrevista: git do usuário, repos nas pastas comuns, configuração anterior, hooks e Node.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const hooks = require("./hooks");

const CASA = os.homedir();
const PASTAS_COMUNS = ["Documents", "Documentos", "source/repos", "repos", "projetos", "projects", "workspace", "dev", "code", "git"];
const IGNORAR = new Set(["node_modules", ".git", ".venv", "venv", "dist", "build", "target", "AppData"]);
const LIMITE_REPOS = 60;

function git(pasta, args) {
  try { return execFileSync("git", ["-C", pasta, ...args], { encoding: "utf8", timeout: 8000, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; }
}

function procurarRepos(raiz, profundidade, achados) {
  if (achados.length >= LIMITE_REPOS || profundidade < 0) return;
  let itens;
  try { itens = fs.readdirSync(raiz, { withFileTypes: true }); } catch { return; }
  if (itens.some((i) => i.name === ".git")) { achados.push(raiz); return; }
  for (const item of itens) {
    if (item.isDirectory() && !IGNORAR.has(item.name) && !item.name.startsWith(".")) procurarRepos(path.join(raiz, item.name), profundidade - 1, achados);
  }
}

function descreverRepo(pasta, email) {
  const principal = git(pasta, ["symbolic-ref", "-q", "--short", "refs/remotes/origin/HEAD"]) || ["origin/main", "origin/master"].find((r) => git(pasta, ["rev-parse", "-q", "--verify", r])) || "";
  const ultimo = email ? git(pasta, ["log", "-1", "--all", `--author=${email}`, "--format=%cs"]) : "";
  return { caminho: pasta.replace(/\\/g, "/"), nome: path.basename(pasta), principal: principal.replace(/^origin\//, "") || null, temRemoto: !!git(pasta, ["remote"]), ultimoCommitSeu: ultimo || null };
}

function lerJson(arquivo) {
  try { return JSON.parse(fs.readFileSync(arquivo, "utf8")); } catch { return null; }
}

function detectar(pastaExtra) {
  const email = git(CASA, ["config", "--global", "user.email"]);
  const raizes = pastaExtra ? [path.resolve(pastaExtra)] : PASTAS_COMUNS.map((p) => path.join(CASA, p)).filter((p) => fs.existsSync(p));
  const achados = [];
  for (const raiz of raizes) procurarRepos(raiz, 3, achados);
  const repos = [...new Set(achados)].map((p) => descreverRepo(p, email)).sort((a, b) => String(b.ultimoCommitSeu).localeCompare(String(a.ultimoCommitSeu)));
  const C = require("../src/caminhos");
  return {
    git: { nome: git(CASA, ["config", "--global", "user.name"]) || null, email: email || null },
    pastasProcuradas: raizes.map((p) => p.replace(/\\/g, "/")),
    repos,
    anterior: lerJson(C.RESPOSTAS),
    idiomaSugerido: /^pt/i.test(Intl.DateTimeFormat().resolvedOptions().locale) ? "pt-BR" : "en",
    skillsExistentes: ["branches", "conversa", "conversation", "my-code-office"].filter((s) => fs.existsSync(path.join(CASA, ".claude", "skills", s, "SKILL.md"))),
    hooksLigados: hooks.status(),
    node: process.version,
    fuso: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

module.exports = { detectar };
