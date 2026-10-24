// Lê os transcripts do Claude Code (~/.claude/projects/*/*.jsonl) e deriva o estado de cada conversa.
// Lê só o começo e o fim do arquivo: há transcripts com dezenas de MB.
"use strict";
const fs = require("fs");
const path = require("path");
const { pastasCommitadas } = require("../hooks/registrar");

const BYTES_INICIO = 64 * 1024;
const BYTES_FIM = 384 * 1024;
const FERRAMENTAS_SUBAGENTE = new Set(["Task", "Agent"]);
const FERRAMENTAS_DE_ESCRITA = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

function lerTrecho(arquivo, inicio, tamanho) {
  const descritor = fs.openSync(arquivo, "r");
  try {
    const buffer = Buffer.alloc(tamanho);
    const lidos = fs.readSync(descritor, buffer, 0, tamanho, inicio);
    return buffer.toString("utf8", 0, lidos);
  } finally {
    fs.closeSync(descritor);
  }
}

function linhasJson(texto, descartarPrimeira) {
  const linhas = texto.split("\n");
  if (descartarPrimeira) linhas.shift();          // pode ter sido cortada no meio
  const eventos = [];
  for (const linha of linhas) {
    if (!linha.trim()) continue;
    try { eventos.push(JSON.parse(linha)); } catch { /* linha cortada no fim do trecho */ }
  }
  return eventos;
}

function lerEventos(arquivo, tamanho) {
  if (tamanho <= BYTES_INICIO + BYTES_FIM) return { inicio: [], fim: linhasJson(lerTrecho(arquivo, 0, tamanho), false) };
  return {
    inicio: linhasJson(lerTrecho(arquivo, 0, BYTES_INICIO), false),
    fim: linhasJson(lerTrecho(arquivo, tamanho - BYTES_FIM, BYTES_FIM), true),
  };
}

function textoDoUsuario(evento) {
  const conteudo = evento.message && evento.message.content;
  if (typeof conteudo === "string") return conteudo;
  if (!Array.isArray(conteudo)) return "";
  return conteudo.filter((bloco) => bloco.type === "text").map((bloco) => bloco.text).join(" ");
}

function promptLimpo(texto) {
  const limpo = texto.replace(/<([\w-]+)[^>]*>[\s\S]*?<\/\1>/g, "").trim();
  return limpo.startsWith("[") || limpo.startsWith("<") ? "" : limpo.slice(0, 300);
}

function primeiroPrompt(eventos) {
  for (const evento of eventos) {
    if (evento.type !== "user" || evento.isSidechain) continue;
    const texto = promptLimpo(textoDoUsuario(evento));
    if (texto) return texto;
  }
  return "";
}

function tokensDeContexto(uso) {
  if (!uso) return 0;
  return (uso.input_tokens || 0) + (uso.cache_read_input_tokens || 0) + (uso.cache_creation_input_tokens || 0);
}

function novoResumo() {
  return { titulo: "", nomeDado: "", cwd: "", branch: "", arquivoEscrito: "", arquivosEscritos: [], branchDaEdicao: {}, ultimoPrompt: "", ultimaResposta: "", tokens: 0, ultimo: null, pendentes: new Map() };
}

function acumularMetadados(resumo, evento) {
  if (evento.cwd) resumo.cwd = evento.cwd;
  if (evento.gitBranch) resumo.branch = evento.gitBranch;
  if (evento.type === "ai-title" && evento.aiTitle) resumo.titulo = evento.aiTitle;
  if (evento.type === "custom-title" && evento.customTitle) resumo.nomeDado = evento.customTitle;
  if (evento.type === "last-prompt" && evento.lastPrompt) resumo.ultimoPrompt = evento.lastPrompt.slice(0, 300);
}

function acumularAssistente(resumo, evento) {
  resumo.tokens = tokensDeContexto(evento.message.usage) || resumo.tokens;
  for (const bloco of evento.message.content || []) {
    if (bloco.type === "text" && bloco.text.trim()) resumo.ultimaResposta = bloco.text.trim().slice(0, 300);
    if (bloco.type !== "tool_use") continue;
    const entrada = bloco.input || {};
    resumo.pendentes.set(bloco.id, { nome: bloco.name, descricao: entrada.description || "" });
    // Commit pelo terminal entra como um arquivo simbólico na raiz da pasta commitada.
    for (const pasta of pastasCommitadas({ tool_name: bloco.name, cwd: evento.cwd, tool_input: entrada })) {
      const marca = path.join(pasta, "(commit)");
      resumo.arquivosEscritos = [...resumo.arquivosEscritos.filter((a) => a !== marca), marca];
    }
    const arquivo = FERRAMENTAS_DE_ESCRITA.has(bloco.name) && (entrada.file_path || entrada.notebook_path);
    if (!arquivo) continue;
    resumo.arquivoEscrito = arquivo;
    resumo.arquivosEscritos = [...resumo.arquivosEscritos.filter((a) => a !== arquivo), arquivo];
    if (evento.gitBranch) resumo.branchDaEdicao[arquivo] = evento.gitBranch;   // branch da pasta de abertura no momento da edição
  }
  resumo.ultimo = resumo.pendentes.size ? "ferramenta" : "resposta";
}

// Esc grava uma linha "[Request interrupted by user]" (ou "... for tool use]"): o turno acabou.
const INTERRUPCAO = /^\[Request interrupted by user/;

function acumularUsuario(resumo, evento) {
  const conteudo = evento.message.content;
  if (Array.isArray(conteudo)) {
    for (const bloco of conteudo) if (bloco.type === "tool_result") resumo.pendentes.delete(bloco.tool_use_id);
  }
  const texto = textoDoUsuario(evento).trim();
  if (INTERRUPCAO.test(texto)) { resumo.ultimo = "interrompido"; resumo.pendentes.clear(); return; }
  if (promptLimpo(texto)) resumo.ultimo = "prompt";
  else if (resumo.ultimo === "ferramenta" && !resumo.pendentes.size) resumo.ultimo = "resultado";
}

function resumir(eventos) {
  const resumo = novoResumo();
  for (const evento of eventos) {
    acumularMetadados(resumo, evento);
    if (evento.isSidechain || !evento.message) continue;
    if (evento.type === "assistant") acumularAssistente(resumo, evento);
    if (evento.type === "user") acumularUsuario(resumo, evento);
  }
  return resumo;
}

function estadoDoResumo(resumo) {
  const subagentes = [...resumo.pendentes.values()].filter((p) => FERRAMENTAS_SUBAGENTE.has(p.nome));
  if (subagentes.length) return { estado: "reuniao", subagentes: subagentes.map((s) => s.descricao || "subagente") };
  if (resumo.ultimo === "resposta" || resumo.ultimo === "interrompido") return { estado: "cafe", subagentes: [] };
  if (resumo.ultimo === "prompt" || resumo.ultimo === "resultado") return { estado: "pensando", subagentes: [] };
  return { estado: "digitando", subagentes: [] };
}

// Cache por arquivo: só relê o transcript quando ele mudou (tamanho ou data).
const cache = new Map();

function lerConversa(arquivo) {
  const stat = fs.statSync(arquivo);
  const guardado = cache.get(arquivo);
  if (guardado && guardado.mtime === stat.mtimeMs && guardado.tamanho === stat.size) return guardado.valor;
  const valor = lerConversaDoDisco(arquivo, stat);
  cache.set(arquivo, { mtime: stat.mtimeMs, tamanho: stat.size, valor });
  return valor;
}

function lerConversaDoDisco(arquivo, stat) {
  const { inicio, fim } = lerEventos(arquivo, stat.size);
  const resumo = resumir(fim);
  const { estado, subagentes } = estadoDoResumo(resumo);
  return {
    id: path.basename(arquivo, ".jsonl"),
    transcript: arquivo,
    atualizado: stat.mtimeMs,
    titulo: resumo.titulo,
    nomeDado: resumo.nomeDado,
    cwd: resumo.cwd,
    branchNoTranscript: resumo.branch,
    arquivoEscrito: resumo.arquivoEscrito,
    arquivosEscritos: resumo.arquivosEscritos,
    branchDaEdicao: resumo.branchDaEdicao,
    interrompida: resumo.ultimo === "interrompido",
    primeiroPrompt: primeiroPrompt(inicio.length ? inicio : fim),
    ultimoPrompt: resumo.ultimoPrompt,
    ultimaResposta: resumo.ultimaResposta,
    tokens: resumo.tokens,
    estado,
    subagentes,
  };
}

function listarTranscripts(pastaProjetos, desdeMs) {
  const encontrados = [];
  if (!fs.existsSync(pastaProjetos)) return encontrados;
  for (const projeto of fs.readdirSync(pastaProjetos)) {
    const pasta = path.join(pastaProjetos, projeto);
    let arquivos;
    try { arquivos = fs.readdirSync(pasta); } catch { continue; }
    for (const nome of arquivos) {
      if (!nome.endsWith(".jsonl")) continue;
      const arquivo = path.join(pasta, nome);
      const stat = fs.statSync(arquivo, { throwIfNoEntry: false });   // pode ter sido apagado entre o readdir e o stat
      if (stat && stat.mtimeMs >= desdeMs) encontrados.push({ arquivo, mtime: stat.mtimeMs });
    }
  }
  return encontrados.sort((a, b) => b.mtime - a.mtime);
}

module.exports = { lerConversa, listarTranscripts, resumir, estadoDoResumo, promptLimpo };
