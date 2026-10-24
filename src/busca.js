// Busca de assunto em todas as conversas do Claude Code (transcripts em ~/.claude/projects/*/*.jsonl).
// Assíncrona e com cache por arquivo: só a primeira busca lê tudo; depois, só os transcripts que mudaram.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");

const PASTA_PROJETOS = path.join(os.homedir(), ".claude", "projects");
const BLOCOS_DE_SISTEMA = /<([\w-]+)[^>]*>[\s\S]*?<\/\1>/g;
const cache = new Map();   // arquivo -> { mtime, tamanho, conversa }

// Sem acento e em minúsculas: "Migração" acha "migracao".
const normalizar = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function textoDaMensagem(evento) {
  const conteudo = evento.message.content;
  const texto = typeof conteudo === "string" ? conteudo
    : Array.isArray(conteudo) ? conteudo.filter((b) => b.type === "text").map((b) => b.text).join(" ") : "";
  return texto.replace(BLOCOS_DE_SISTEMA, " ").replace(/\s+/g, " ").trim();
}

function conversaDoTexto(arquivo, conteudo) {
  const conversa = { id: path.basename(arquivo, ".jsonl"), arquivo, titulo: "", nomeDado: "", mensagens: [] };
  for (const linha of conteudo.split("\n")) {
    if (!linha.includes('"type":"user"') && !linha.includes('"type":"assistant"') && !linha.includes("-title")) continue;
    let evento;
    try { evento = JSON.parse(linha); } catch { continue; }
    if (evento.type === "ai-title") conversa.titulo = evento.aiTitle || conversa.titulo;
    if (evento.type === "custom-title") conversa.nomeDado = evento.customTitle || conversa.nomeDado;
    if (evento.isSidechain || !evento.message || !["user", "assistant"].includes(evento.type)) continue;
    const texto = textoDaMensagem(evento);
    if (texto && !texto.startsWith("[Request interrupted")) conversa.mensagens.push({ quem: evento.type, quando: evento.timestamp || "", texto, busca: normalizar(texto) });
  }
  return conversa;
}

async function lerConversa(arquivo) {
  const stat = await fs.promises.stat(arquivo);
  const guardado = cache.get(arquivo);
  if (guardado && guardado.mtime === stat.mtimeMs && guardado.tamanho === stat.size) return guardado.conversa;
  const conversa = conversaDoTexto(arquivo, await fs.promises.readFile(arquivo, "utf8"));
  cache.set(arquivo, { mtime: stat.mtimeMs, tamanho: stat.size, conversa });
  return conversa;
}

async function listarArquivos(pasta) {
  const projetos = await fs.promises.readdir(pasta).catch(() => []);
  const listas = await Promise.all(projetos.map(async (projeto) => {
    const nomes = await fs.promises.readdir(path.join(pasta, projeto)).catch(() => []);
    return nomes.filter((n) => n.endsWith(".jsonl")).map((n) => path.join(pasta, projeto, n));
  }));
  return listas.flat();
}

function trechoEm(texto, palavra) {
  const i = Math.max(0, normalizar(texto).indexOf(palavra));
  const inicio = Math.max(0, i - 80), fim = Math.min(texto.length, i + palavra.length + 120);
  return `${inicio ? "…" : ""}${texto.slice(inicio, fim)}${fim < texto.length ? "…" : ""}`;
}

// Mensagem casa quando contém todas as palavras do termo.
function resultadoDa(conversa, palavras) {
  const casadas = conversa.mensagens.filter((m) => palavras.every((p) => m.busca.includes(p)));
  if (!casadas.length) return null;
  const ultima = casadas[casadas.length - 1];
  return {
    id: conversa.id, arquivo: conversa.arquivo, titulo: conversa.nomeDado || conversa.titulo || "(sem título)",
    quando: ultima.quando, vezes: casadas.length, quem: ultima.quem, trecho: trechoEm(ultima.texto, palavras[0]),
  };
}

async function buscar(termo, { limite = 10, excluir = [], pasta = PASTA_PROJETOS } = {}) {
  const palavras = normalizar(termo).split(/\s+/).filter((p) => p.length > 1);
  if (!palavras.length) return [];
  const resultados = [];
  for (const arquivo of await listarArquivos(pasta)) {
    if (excluir.includes(path.basename(arquivo, ".jsonl"))) continue;
    try {
      const achado = resultadoDa(await lerConversa(arquivo), palavras);
      if (achado) resultados.push(achado);
    } catch { /* transcript apagado ou ilegível: segue */ }
  }
  return resultados.sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, limite);
}

module.exports = { buscar, normalizar };
