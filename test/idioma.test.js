"use strict";
// Idiomas e troca de nome: dicionário completo, modelos nos dois idiomas, entrevista em inglês e migração.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { TEXTOS, traduzir, resolverIdioma } = require("../media/textos");

const APLICAR = path.join(__dirname, "..", "configurador", "aplicar.js");
const MODELOS = path.join(__dirname, "..", "configurador", "modelos");

test("todo texto existe nos dois idiomas", () => {
  const pt = Object.keys(TEXTOS["pt-BR"]).sort(), en = Object.keys(TEXTOS.en).sort();
  assert.deepEqual(pt.filter((k) => !en.includes(k)), [], "faltam em inglês");
  assert.deepEqual(en.filter((k) => !pt.includes(k)), [], "faltam em português");
});

test("plural, parâmetros e idioma automático", () => {
  assert.equal(traduzir("en", "correio.commits", { n: 1 }), "1 commit");
  assert.equal(traduzir("en", "correio.commits", { n: 3 }), "3 commits");
  assert.equal(traduzir("pt-BR", "cena.reuniaoN", { n: 2 }), "Reunião · 2 subagentes");
  assert.equal(resolverIdioma("auto", "pt-br"), "pt-BR");
  assert.equal(resolverIdioma("auto", "de"), "en");
  assert.equal(resolverIdioma("en", "pt-br"), "en");
});

test("os modelos de skill existem nos dois idiomas", () => {
  assert.deepEqual(fs.readdirSync(path.join(MODELOS, "pt-BR")).sort(), fs.readdirSync(path.join(MODELOS, "en")).sort());
});

function casaFalsa() {
  const casa = fs.mkdtempSync(path.join(os.tmpdir(), "mco-idioma-"));
  const repo = path.join(casa, "Documents", "repo-x");
  fs.mkdirSync(repo, { recursive: true });
  execFileSync("git", ["init", "-q", repo]);
  fs.writeFileSync(path.join(fs.mkdirSync(path.join(casa, ".claude"), { recursive: true }) || path.join(casa, ".claude"), "settings.json"), JSON.stringify({ theme: "dark" }));
  return { casa, repo };
}
const rodar = (casa, ...args) => execFileSync(process.execPath, [APLICAR, ...args], { encoding: "utf8", env: { ...process.env, HOME: casa, USERPROFILE: casa } });

test("entrevista em inglês gera /conversation e tira /conversa", () => {
  const { casa, repo } = casaFalsa();
  const claude = path.join(casa, ".claude");
  fs.mkdirSync(path.join(claude, "skills", "conversa"), { recursive: true });
  fs.mkdirSync(path.join(claude, "skills", "aviso"), { recursive: true });
  const respostas = path.join(casa, "r.json");
  fs.writeFileSync(respostas, JSON.stringify({ idioma: "en", nome: "Ana", apelido: "jarvis", repos: [repo], ambientes: ["dev"], hooks: false }));
  rodar(casa, respostas);
  assert.ok(fs.existsSync(path.join(claude, "skills", "conversation", "SKILL.md")));
  assert.ok(!fs.existsSync(path.join(claude, "skills", "conversa")));
  const notice = fs.readFileSync(path.join(claude, "skills", "notice", "SKILL.md"), "utf8");
  assert.match(notice, /^---\r?\nname: notice\r?\n/);
  assert.match(notice, /"jarvis, put X on the board"/);
  assert.ok(!/\{\{/.test(notice), "sem marcador sem preencher");
  assert.ok(!fs.existsSync(path.join(claude, "skills", "aviso")));
  assert.ok(fs.existsSync(path.join(claude, "my-code-office", "ferramentas", "bin", "aviso.js")));
  assert.match(fs.readFileSync(path.join(claude, "skills", "branches", "SKILL.md"), "utf8"), /Ana's branches dashboard/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(claude, "my-code-office", "config.json"), "utf8")).tituloFila, "Ana's queue");
  assert.match(fs.readFileSync(path.join(claude, "skills", "my-code-office", "SKILL.md"), "utf8"), /Setup interview for My Code Office/);
});

test("migra do nome antigo: pasta, hooks e skills", () => {
  const { casa, repo } = casaFalsa();
  const claude = path.join(casa, ".claude"), antiga = path.join(claude, "escritorio");
  fs.mkdirSync(path.join(antiga, "hooks"), { recursive: true });
  fs.writeFileSync(path.join(antiga, "avisos.md"), "# Quadro\n- [ ] aviso antigo\n");
  fs.writeFileSync(path.join(antiga, "respostas.json"), JSON.stringify({ nome: "Ana", repos: [repo], ambientes: ["tst"], hooks: true }));
  fs.writeFileSync(path.join(claude, "settings.json"), JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: `node "${antiga.replace(/\\/g, "/")}/hooks/registrar.js"` }] }] } }));
  fs.mkdirSync(path.join(claude, "skills", "escritorio-boas-vindas"), { recursive: true });
  const resultado = JSON.parse(rodar(casa, "--migrar"));
  assert.equal(resultado.migrou, true);
  assert.match(fs.readFileSync(path.join(claude, "my-code-office", "avisos.md"), "utf8"), /aviso antigo/);
  const settings = JSON.parse(fs.readFileSync(path.join(claude, "settings.json"), "utf8"));
  assert.equal(settings.hooks.Stop.length, 1, "sem hook duplicado");
  assert.match(settings.hooks.Stop[0].hooks[0].command, /my-code-office\/hooks\/registrar\.js/);
  assert.ok(!fs.existsSync(path.join(claude, "skills", "escritorio-boas-vindas")));
  assert.ok(fs.existsSync(path.join(claude, "skills", "my-code-office", "SKILL.md")));
  assert.ok(!fs.existsSync(antiga) && fs.readdirSync(claude).some((n) => n.startsWith("escritorio.migrado-")));
  assert.equal(JSON.parse(rodar(casa, "--migrar")).migrou, false, "só migra uma vez");
});
