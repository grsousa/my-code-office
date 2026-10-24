"use strict";
// Ignorar branch no correio: grava na seção "Ignoradas" do estado.md e tira os commits da conta.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { lerIgnoradas, ignorarBranch, voltarBranch } = require("../src/quadros");
const { pendencias, definirIgnoradas } = require("../src/git");

const ESTADO = ["# Estado", "", "## Ambientes", "| dev | ? |", "", "## Ignoradas", "", "<!-- formato -->",
  "- `repo-a` `feature/velha` — já em produção (2026-10-13)", "", "## Histórico", "", "- 2026-10-02 · tst"].join("\r\n");

test("ignorar e voltar mexem só na seção Ignoradas e preservam o CRLF", () => {
  const arquivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mco-ign-")), "estado.md");
  fs.writeFileSync(arquivo, ESTADO);
  ignorarBranch(arquivo, "repo-x", "spike/y", "sem push previsto", "2026-10-20");
  ignorarBranch(arquivo, "repo-x", "spike/y", "de novo", "2026-10-21");   // não duplica
  const texto = fs.readFileSync(arquivo, "utf8");
  assert.ok(!/[^\r]\n/.test(texto), "sem LF solto");
  assert.deepEqual(lerIgnoradas(arquivo).map((i) => `${i.repo} ${i.branch}`), ["repo-a feature/velha", "repo-x spike/y"]);
  assert.ok(texto.indexOf("repo-x") < texto.indexOf("## Histórico"));
  assert.equal(voltarBranch(arquivo, "repo-x", "spike/y"), true);
  assert.equal(fs.readFileSync(arquivo, "utf8"), ESTADO);
});

test("arquivo sem a seção ganha uma", () => {
  const arquivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mco-ign-")), "novo", "estado.md");
  ignorarBranch(arquivo, "repo-x", "*", "sem push previsto", "2026-10-20");
  assert.deepEqual(lerIgnoradas(arquivo), [{ repo: "repo-x", branch: "*", motivo: "sem push previsto (2026-10-20)" }]);
});

test("branch ignorada sai da conta; commit em outra branch continua contando", async () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "mco-repo-"));
  const g = (...a) => execFileSync("git", ["-C", repo, "-c", "user.email=ana@x", "-c", "user.name=Ana", ...a], { stdio: "pipe" });
  g("init", "-q", "-b", "main"); g("config", "user.email", "ana@x");
  g("commit", "-q", "--allow-empty", "-m", "base");
  g("checkout", "-q", "-b", "spike"); g("commit", "-q", "--allow-empty", "-m", "s1"); g("commit", "-q", "--allow-empty", "-m", "s2");
  const contar = (ignorar) => new Promise((resolve) => {
    definirIgnoradas(new Map([[path.basename(repo), new Set(ignorar)]]));
    const agora = pendencias(repo, () => resolve(pendencias(repo, () => {})));
    if (agora && agora.commits !== undefined && ignorar.length === 0) resolve(agora);
  });
  const tudo = await contar([]);
  assert.equal(tudo.semRemoto, true);
  assert.equal(tudo.commits, 3);
  assert.deepEqual(tudo.branches.map((b) => [b.nome, b.commits]), [["spike", 3], ["main", 1]]);
  const semSpike = await contar(["spike"]);
  assert.equal(semSpike.commits, 1, "o commit base está na main, que conta");
  assert.equal(semSpike.branches.find((b) => b.nome === "spike").ignorada, true);
  assert.equal((await contar(["*"])).commits, 0);
});
