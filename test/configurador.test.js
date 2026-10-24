"use strict";
// Roda o configurador numa "casa" temporária: nada toca o ~/.claude de verdade.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const APLICAR = path.join(__dirname, "..", "configurador", "aplicar.js");

function casaFalsa() {
  const casa = fs.mkdtempSync(path.join(os.tmpdir(), "mco-casa-"));
  const repo = path.join(casa, "Documents", "meu-repo");
  fs.mkdirSync(repo, { recursive: true });
  execFileSync("git", ["init", "-q", repo]);
  fs.mkdirSync(path.join(casa, ".claude", "branches"), { recursive: true });
  fs.writeFileSync(path.join(casa, ".claude", "branches", "estado.md"), "# Estado\n\n## Ambientes\n\n| Ambiente | Ocupado por | Branch(es) | Desde | Observação |\n|---|---|---|---|---|\n| tst | Ana | feature/x | 2026-10-08 | |\n\n## Histórico\n- 2026-10-08 · tst · Ana\n");
  fs.writeFileSync(path.join(casa, ".claude", "settings.json"), JSON.stringify({ theme: "dark" }));
  return { casa, repo };
}
const rodar = (casa, ...args) => execFileSync(process.execPath, [APLICAR, ...args], { encoding: "utf8", env: { ...process.env, HOME: casa, USERPROFILE: casa } });

test("detecta o repo da casa", () => {
  const { casa } = casaFalsa();
  const info = JSON.parse(rodar(casa, "--detectar"));
  assert.ok(info.repos.some((r) => r.nome === "meu-repo"));
});

test("aplica, preserva o que já estava registrado e restaura tudo", () => {
  const { casa, repo } = casaFalsa();
  const respostas = path.join(casa, "respostas.json");
  fs.writeFileSync(respostas, JSON.stringify({ nome: "Ana", tratamento: "gestora", apelido: "jarvis", repos: [repo], ambientes: ["dev", "TST"], hooks: true, podeFetch: false, avisos: ["Migrar X"] }));
  const saida = JSON.parse(rodar(casa, respostas));
  const claude = path.join(casa, ".claude");
  const skill = fs.readFileSync(path.join(claude, "skills", "branches", "SKILL.md"), "utf8");
  assert.match(skill, /Jarvis — painel das branches de Ana/);
  assert.doesNotMatch(skill, /\{\{\w+\}\}/, "nenhum espaço do modelo pode sobrar");
  assert.match(fs.readFileSync(path.join(claude, "skills", "branches", "scripts", "coletar.sh"), "utf8"), /meu-repo/);
  const estado = fs.readFileSync(path.join(claude, "branches", "estado.md"), "utf8");
  assert.match(estado, /\| tst \| Ana \| feature\/x/, "a reserva do tst continua");
  assert.match(estado, /\| dev \| \?/);
  assert.match(estado, /## Histórico\n- 2026-10-08/, "o resto do documento continua");
  assert.match(fs.readFileSync(path.join(claude, "my-code-office", "avisos.md"), "utf8"), /- \[ \] Migrar X/);
  const config = JSON.parse(fs.readFileSync(path.join(claude, "my-code-office", "config.json"), "utf8"));
  assert.equal(config.tituloFila, "Fila da gestora");
  const settings = JSON.parse(fs.readFileSync(path.join(claude, "settings.json"), "utf8"));
  assert.equal(settings.theme, "dark");
  assert.match(settings.hooks.Stop[0].hooks[0].command, /my-code-office\/hooks\/registrar\.js/);
  assert.ok(fs.existsSync(path.join(claude, "my-code-office", "ferramentas", "bin", "buscar.js")));

  rodar(casa, "--restaurar", saida.backup);
  assert.ok(!fs.existsSync(path.join(claude, "skills", "branches")), "skill que não existia some");
  assert.ok(!fs.existsSync(path.join(claude, "my-code-office", "config.json")));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(claude, "settings.json"), "utf8")), { theme: "dark" });
  assert.match(fs.readFileSync(path.join(claude, "branches", "estado.md"), "utf8"), /\| tst \| Ana/);
});

test("instala a skill da entrevista apontando para o configurador", () => {
  const { casa } = casaFalsa();
  rodar(casa, "--instalar-setup");
  const skill = fs.readFileSync(path.join(casa, ".claude", "skills", "my-code-office", "SKILL.md"), "utf8");
  assert.match(skill, /configurador\/aplicar\.js/);
  assert.doesNotMatch(skill, /\{\{\w+\}\}/);
});
