"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { aplicarEvento } = require("../hooks/registrar");

const base = { session_id: "abc-123", cwd: os.tmpdir(), transcript_path: "/tmp/t.jsonl" };
const evento = (nome, extra = {}) => ({ ...base, hook_event_name: nome, ...extra });
const repoTemporario = () => { const repo = fs.mkdtempSync(path.join(os.tmpdir(), "mco-repo-")); execFileSync("git", ["init", "-q", repo]); return repo; };

test("prompt deixa a conversa pensando e guarda o texto", () => {
  const estado = aplicarEvento({}, evento("UserPromptSubmit", { prompt: "olá" }), 1000);
  assert.equal(estado.estado, "pensando");
  assert.equal(estado.primeiroPrompt, "olá");
  assert.equal(estado.desde, 1000);
});

test("subagente em segundo plano fica na reunião até o SubagentStop, mesmo depois do Stop", () => {
  let estado = aplicarEvento({}, evento("PreToolUse", { tool_name: "Agent", tool_use_id: "b1", tool_input: { description: "revisar" } }), 1);
  estado = aplicarEvento(estado, evento("PostToolUse", { tool_name: "Agent", tool_use_id: "b1" }), 2);
  assert.equal(estado.estado, "reuniao");
  estado = aplicarEvento(estado, evento("Stop"), 3);
  assert.equal(estado.estado, "reuniao");
  estado = aplicarEvento(estado, evento("SubagentStop", { agent_id: "x" }), 4);
  assert.equal(estado.estado, "cafe");
  assert.deepEqual(estado.subagentesFundo, {});
});

test("reinício da sessão esvazia a sala de reunião", () => {
  let estado = aplicarEvento({}, evento("PreToolUse", { tool_name: "Agent", tool_use_id: "b1", tool_input: { description: "revisar" } }), 1);
  estado = aplicarEvento(estado, evento("SessionStart", { source: "resume" }), 2);
  assert.deepEqual(estado.subagentesFundo, {});
  assert.equal(estado.estado, "cafe");
});

test("subagente em primeiro plano abre e fecha a reunião", () => {
  let estado = aplicarEvento({}, evento("PreToolUse", { tool_name: "Agent", tool_use_id: "t1", tool_input: { description: "pesquisar", run_in_background: false } }), 1);
  assert.equal(estado.estado, "reuniao");
  assert.deepEqual(Object.values(estado.subagentes), ["pesquisar"]);
  estado = aplicarEvento(estado, evento("PostToolUse", { tool_name: "Agent", tool_use_id: "t1" }), 2);
  assert.equal(estado.estado, "digitando");
  assert.deepEqual(estado.subagentes, {});
});

test("pedido de permissão vira 'esperando' e o aviso de ociosidade é ignorado", () => {
  let estado = aplicarEvento({}, evento("Stop"), 1);
  estado = aplicarEvento(estado, evento("Notification", { message: "Claude is waiting for your input" }), 2);
  assert.equal(estado.estado, "cafe");
  estado = aplicarEvento(estado, evento("Notification", { message: "Claude needs your permission to use Bash" }), 3);
  assert.equal(estado.estado, "esperando");
  assert.match(estado.pedido, /permission/);
});

test("desde só muda quando o estado muda", () => {
  let estado = aplicarEvento({}, evento("PreToolUse", { tool_name: "Read" }), 10);
  estado = aplicarEvento(estado, evento("PostToolUse", { tool_name: "Read" }), 20);
  assert.equal(estado.desde, 10);
});

test("só ferramentas de escrita mudam o repo da mesa", () => {
  const repo = repoTemporario();
  const lido = aplicarEvento({}, evento("PreToolUse", { tool_name: "Read", tool_input: { file_path: path.join(repo, "README.md") } }), 1);
  assert.notEqual(lido.repoAtual, require("../hooks/registrar").raizGit(repo));
  const escrito = aplicarEvento(lido, evento("PreToolUse", { tool_name: "Edit", tool_input: { file_path: path.join(repo, "README.md") } }), 2);
  assert.equal(escrito.repoAtual, require("../hooks/registrar").raizGit(repo));
  assert.equal(escrito.repos[escrito.repoAtual].editado, true);
});

test("evento desconhecido não altera nada", () => {
  const antes = { estado: "cafe" };
  assert.equal(aplicarEvento(antes, evento("Inventado"), 1), antes);
});

test("o script nunca falha, mesmo com entrada inválida", () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "escritorio-"));
  const script = path.join(__dirname, "..", "hooks", "registrar.js");
  const env = { ...process.env, MCO_PASTA_SESSOES: pasta };
  execFileSync(process.execPath, [script], { input: "isso não é json", env });
  execFileSync(process.execPath, [script], { input: JSON.stringify({ ...evento("Stop"), session_id: "../fora" }), env });
  execFileSync(process.execPath, [script], { input: JSON.stringify(evento("Stop")), env });
  assert.deepEqual(fs.readdirSync(pasta), ["abc-123.json"]);
  assert.equal(JSON.parse(fs.readFileSync(path.join(pasta, "abc-123.json"), "utf8")).estado, "cafe");
});

test("eventos simultâneos não se perdem (trava por conversa)", async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "escritorio-trava-"));
  const script = path.join(__dirname, "..", "hooks", "registrar.js");
  const { spawn } = require("child_process");
  const rodar = (i) => new Promise((resolve) => {
    const filho = spawn(process.execPath, [script], { env: { ...process.env, MCO_PASTA_SESSOES: pasta } });
    filho.on("exit", resolve);
    filho.stdin.end(JSON.stringify(evento("PreToolUse", { tool_name: "Agent", tool_use_id: "t" + i, tool_input: { description: "a" + i } })));
  });
  await Promise.all(Array.from({ length: 10 }, (_, i) => rodar(i)));
  const estado = JSON.parse(fs.readFileSync(path.join(pasta, "abc-123.json"), "utf8"));
  assert.equal(Object.keys(estado.subagentesFundo).length, 10);
  assert.deepEqual(fs.readdirSync(pasta), ["abc-123.json"]);   // sem .tmp nem .lock sobrando
});

test("a branch vista acompanha cada edição e o turno ativo decide o fim da reunião", () => {
  const repo = repoTemporario();
  let estado = aplicarEvento({}, evento("PreToolUse", { tool_name: "Edit", tool_input: { file_path: path.join(repo, "x") } }), 1);
  const raiz = estado.repoAtual;
  estado.repos[raiz].branchVisto = "antiga";
  estado = aplicarEvento(estado, evento("PreToolUse", { tool_name: "Edit", tool_input: { file_path: path.join(repo, "x") } }), 2);
  assert.notEqual(estado.repos[raiz].branchVisto, "antiga");
  assert.equal(estado.repos[raiz].primeiroToque, 1);
  estado = aplicarEvento(estado, evento("UserPromptSubmit", { prompt: "oi" }), 3);
  estado = aplicarEvento(estado, evento("PreToolUse", { tool_name: "Agent", tool_use_id: "b", tool_input: {} }), 4);
  estado = aplicarEvento(estado, evento("SubagentStop", {}), 5);
  assert.equal(estado.estado, "digitando");
});

test("compactação no meio do turno não reinicia o estado; PostToolUse limpa o pedido", () => {
  let estado = aplicarEvento({}, evento("Notification", { message: "Claude needs your permission to use Bash" }), 1);
  estado = aplicarEvento(estado, evento("PostToolUse", { tool_name: "Bash" }), 2);
  assert.equal(estado.pedido, null);
  estado = aplicarEvento(estado, evento("SessionStart", { source: "compact" }), 3);
  assert.equal(estado.estado, "digitando");
});

test("commit feito pelo terminal registra o repo; comando só de leitura não", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "mco-commit-"));
  execFileSync("git", ["init", "-q", repo]);
  const { raizGit, pastasCommitadas } = require("../hooks/registrar");
  const lido = aplicarEvento({}, evento("PostToolUse", { tool_name: "Bash", tool_input: { command: `cd "${repo}" && git status && git log -1` } }), 1);
  assert.equal(lido.repoAtual, undefined);
  const commitado = aplicarEvento(lido, evento("PostToolUse", { tool_name: "Bash", tool_input: { command: `cd "${repo}" && cp a b && git add . && git commit -m "ci: x; y"` } }), 2);
  assert.equal(commitado.repoAtual, raizGit(repo));
  assert.equal(commitado.repos[commitado.repoAtual].editado, true);
  assert.deepEqual(pastasCommitadas({ tool_name: "Bash", cwd: "C:/a", tool_input: { command: "git -C /c/b/c commit -qm z" } }), [path.resolve("C:/b/c")]);
});
