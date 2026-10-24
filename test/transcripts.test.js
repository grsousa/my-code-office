"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { resumir, estadoDoResumo, promptLimpo } = require("../src/transcripts");
const { lerAmbientes } = require("../src/quadros");
const { detectarConflitos, aplicarCochilo, aplicarHook } = require("../src/retrato");
const fs = require("fs");
const os = require("os");
const path = require("path");

const usuario = (texto) => ({ type: "user", message: { content: texto } });
const resultado = (id) => ({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id }] } });
const assistente = (...blocos) => ({ type: "assistant", message: { content: blocos, usage: { input_tokens: 10, cache_read_input_tokens: 90 } } });

test("resposta final vira café; ferramenta pendente vira digitando", () => {
  assert.equal(estadoDoResumo(resumir([usuario("oi"), assistente({ type: "text", text: "pronto" })])).estado, "cafe");
  assert.equal(estadoDoResumo(resumir([usuario("oi"), assistente({ type: "tool_use", id: "a", name: "Bash", input: {} })])).estado, "digitando");
});

test("subagente sem resultado vira reunião com a descrição", () => {
  const eventos = [usuario("oi"), assistente({ type: "tool_use", id: "s", name: "Task", input: { description: "varrer repos" } })];
  assert.deepEqual(estadoDoResumo(resumir(eventos)), { estado: "reuniao", subagentes: ["varrer repos"] });
  assert.equal(estadoDoResumo(resumir([...eventos, resultado("s")])).estado, "pensando");
});

test("metadados: título, nome dado, branch e tokens", () => {
  const resumo = resumir([
    { type: "ai-title", aiTitle: "Título automático" }, { type: "custom-title", customTitle: "Jarvis" },
    { type: "user", cwd: "C:/x", gitBranch: "main", message: { content: "oi" } }, assistente({ type: "text", text: "ok" }),
  ]);
  assert.equal(resumo.titulo, "Título automático");
  assert.equal(resumo.nomeDado, "Jarvis");
  assert.equal(resumo.branch, "main");
  assert.equal(resumo.tokens, 100);
});

test("o repo vem do último arquivo editado, não da pasta de abertura", () => {
  const leitura = assistente({ type: "tool_use", id: "r", name: "Read", input: { file_path: "C:/repoA/x.py" } });
  assert.equal(resumir([{ type: "user", cwd: "C:/repoB", message: { content: "oi" } }, leitura]).arquivoEscrito, "");
  const edicao = assistente({ type: "tool_use", id: "e", name: "Edit", input: { file_path: "C:/repoA/x.py" } });
  assert.equal(resumir([leitura, edicao]).arquivoEscrito, "C:/repoA/x.py");
  const outra = assistente({ type: "tool_use", id: "f", name: "Write", input: { file_path: "C:/repoB/y.py" } });
  assert.deepEqual(resumir([edicao, outra, edicao]).arquivosEscritos, ["C:/repoB/y.py", "C:/repoA/x.py"]);
});

test("prompt limpo descarta blocos de sistema e notificações", () => {
  assert.equal(promptLimpo("<system-reminder>x</system-reminder> pergunta real"), "pergunta real");
  assert.equal(promptLimpo("<task-notification>x</task-notification>"), "");
});

test("tabela de ambientes do /branches", () => {
  const arquivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "amb-")), "estado.md");
  fs.writeFileSync(arquivo, "| Ambiente | Ocupado por | Branch | Desde | Obs |\n|---|---|---|---|---|\n| dev | ? | ? | ? | |\n| tst | Ana | `repo-a` x | 2026-10-08 | |\n");
  const [dev, tst, hmg] = lerAmbientes(arquivo);
  assert.equal(dev.quem, null);
  assert.equal(tst.quem, "Ana");
  assert.equal(tst.branch, "repo-a x");
  assert.equal(hmg.k, "hmg");
});

test("esbarrão só quando duas conversas ativas dividem o repo e a branch mudou", () => {
  const s = (id, mudou, extra) => ({ id, estado: "digitando", repos: [{ raiz: "C:/r", branchMudou: mudou }], ...extra });
  assert.deepEqual(detectarConflitos([s("a", false), s("b", false)]), []);
  assert.deepEqual(detectarConflitos([s("a", true), s("b", false)]), [["a", "b"]]);
  assert.deepEqual(detectarConflitos([s("a", true), s("b", false, { estado: "dormindo" })]), []);
});

test("esbarrão também vale para um repo secundário da conversa", () => {
  const a = { id: "a", estado: "digitando", repos: [{ raiz: "C:/principal", branchMudou: false }, { raiz: "C:/outro", branchMudou: true }] };
  const b = { id: "b", estado: "pensando", repos: [{ raiz: "C:/outro", branchMudou: false }] };
  assert.deepEqual(detectarConflitos([a, b]), [["a", "b"]]);
});

test("registro antigo do hook (pasta de abertura, sem 'editado') não vira repo da mesa", () => {
  const conversa = { atualizado: 1000 };
  const antigo = { atualizado: 2000, estado: "cafe", repoAtual: "C:/repo-a", repos: { "C:/repo-a": { branchVisto: "x" } } };
  assert.deepEqual(aplicarHook(conversa, antigo).reposEditados, []);
  const novo = { ...antigo, repos: { "C:/repo-a": { branchVisto: "x", editado: true, ultimoToque: 5 }, "C:/outro": { branchVisto: "y", editado: true, ultimoToque: 9 } } };
  assert.deepEqual(aplicarHook(conversa, novo).reposEditados.map((r) => r.raiz), ["C:/outro", "C:/repo-a"]);
});

test("cochilo depois do limite, menos para quem espera você", () => {
  const velho = { estado: "cafe", atualizado: 0 };
  assert.equal(aplicarCochilo(velho, 61 * 60000, 60).estado, "dormindo");
  assert.equal(aplicarCochilo({ ...velho, estado: "esperando" }, 61 * 60000, 60).estado, "esperando");
});

test("Esc encerra o turno: no transcript e por cima do hook", () => {
  const eventos = [usuario("oi"), assistente({ type: "tool_use", id: "a", name: "Bash", input: {} }),
    { type: "user", message: { content: [{ type: "text", text: "[Request interrupted by user for tool use]" }] } }];
  assert.equal(estadoDoResumo(resumir(eventos)).estado, "cafe");
  const hook = { atualizado: 1000, estado: "digitando", desde: 900 };
  assert.equal(aplicarHook({ atualizado: 2000, interrompida: true }, hook).estado, "cafe");
  assert.equal(aplicarHook({ atualizado: 500, interrompida: true }, hook).estado, "digitando");
  assert.equal(aplicarHook({ atualizado: 9000 }, hook).fonte, "hooks");   // não alterna para o transcript
});

test("esbarrão aponta a conversa afetada mesmo sendo a terceira do grupo", () => {
  const s = (id, mudou) => ({ id, estado: "digitando", repos: [{ raiz: "C:/r", branchMudou: mudou }] });
  assert.deepEqual(detectarConflitos([s("a", false), s("b", false), s("c", true)]), [["c", "a"]]);
});

test("commit pelo terminal no histórico conta como edição do repo", () => {
  const comando = "cd /c/proj/repo-a && git add . && git commit -m 'x'";
  const resumo = resumir([usuario("oi"), { ...assistente({ type: "tool_use", id: "c", name: "Bash", input: { command: comando } }), cwd: "C:/outro" }]);
  assert.deepEqual(resumo.arquivosEscritos.map((a) => path.dirname(a)), [path.resolve("C:/proj/repo-a")]);
});
