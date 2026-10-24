// Lê os arquivos de apoio: tabela de ambientes (skill /branches) e avisos do quadro.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");

const AMBIENTES_PADRAO = ["dev", "tst", "hmg"];
const MAXIMO_DE_SALAS = 4;   // cabem 4 salas na parede do escritório

function expandir(caminho) {
  return caminho.startsWith("~") ? path.join(os.homedir(), caminho.slice(1)) : caminho;
}

function lerTexto(caminho) {
  try { return fs.readFileSync(expandir(caminho), "utf8"); } catch { return ""; }
}

function vazio(valor) {
  const limpo = (valor || "").replace(/`/g, "").trim();
  return !limpo || limpo === "?" || limpo === "-" ? null : limpo;
}

// Linha da tabela: | Ambiente | Ocupado por | Branch(es) | Desde | Observação |
function linhaDeAmbiente(linha, nomes) {
  const celulas = linha.split("|").slice(1, -1).map((c) => c.trim());
  const chave = (celulas[0] || "").toLowerCase();
  if (!nomes.includes(chave)) return null;
  return { k: chave, quem: vazio(celulas[1]), branch: vazio(celulas[2]), desde: vazio(celulas[3]), obs: vazio(celulas[4]) };
}

function lerAmbientes(caminho, escolhidos = AMBIENTES_PADRAO) {
  const nomes = escolhidos.map((n) => String(n).toLowerCase()).slice(0, MAXIMO_DE_SALAS);
  const encontrados = new Map();
  for (const linha of lerTexto(caminho).split("\n")) {
    const ambiente = linha.trim().startsWith("|") ? linhaDeAmbiente(linha, nomes) : null;
    if (ambiente) encontrados.set(ambiente.k, ambiente);
  }
  return nomes.map((k) => encontrados.get(k) || { k, quem: null, branch: null, desde: null, obs: null });
}

// Aviso = item de lista: "- texto" ou "- [ ] texto" (pendente), "- [x] texto" (feito).
const AVISO = /^\s*- (?:\[([ xX])\] )?(.+?)\s*$/;

function lerAvisos(caminho) {
  return lerTexto(caminho).split("\n").flatMap((linha, indice) => {
    const partes = linha.match(AVISO);
    return partes ? [{ linha: indice, texto: partes[2], feito: (partes[1] || " ").toLowerCase() === "x" }] : [];
  });
}

// Marca ou desmarca um aviso. Confere o texto da linha para não mexer no aviso errado se o arquivo mudou.
function marcarAviso(caminho, linha, texto, feito) {
  const arquivo = expandir(caminho), conteudo = lerTexto(arquivo);
  const fimDeLinha = conteudo.includes("\r\n") ? "\r\n" : "\n";   // preserva CRLF de arquivos editados no Windows
  const linhas = conteudo.split(fimDeLinha);
  const partes = (linhas[linha] || "").match(AVISO);
  if (!partes || partes[2] !== texto) return false;
  const recuo = linhas[linha].match(/^\s*/)[0];
  linhas[linha] = `${recuo}- [${feito ? "x" : " "}] ${texto}`;
  fs.writeFileSync(arquivo, linhas.join(fimDeLinha));
  return true;
}

// Novo aviso pendente no fim do quadro; não repete um pendente com o mesmo texto.
function adicionarAviso(caminho, texto) {
  const limpo = String(texto).replace(/\s+/g, " ").trim();
  if (!limpo || lerAvisos(caminho).some((a) => !a.feito && a.texto === limpo)) return false;
  const arquivo = expandir(caminho), conteudo = lerTexto(arquivo) || "# Quadro de avisos\n\n";
  const fimDeLinha = conteudo.includes("\r\n") ? "\r\n" : "\n";
  const base = conteudo.endsWith(fimDeLinha) ? conteudo : conteudo + fimDeLinha;
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, `${base}- [ ] ${limpo}${fimDeLinha}`);
  return true;
}

// Seção "## Ignoradas" do estado.md, a mesma que a skill /branches respeita:
// - `repo` `branch` — motivo (AAAA-MM-DD). Branch "*" ignora o repo inteiro.
const IGNORADA = /^\s*- `([^`]+)` `([^`]+)`(?:\s+[—-]\s+(.*))?\s*$/;
const SECAO_IGNORADAS = /^##\s+Ignoradas\s*$/i;

function linhasDoArquivo(caminho) {
  const conteudo = lerTexto(caminho), fimDeLinha = conteudo.includes("\r\n") ? "\r\n" : "\n";
  return { linhas: conteudo ? conteudo.split(fimDeLinha) : [], fimDeLinha };
}

// [inicio, fim) das linhas da seção, ou null se ela não existe.
function trechoDasIgnoradas(linhas) {
  const inicio = linhas.findIndex((l) => SECAO_IGNORADAS.test(l));
  if (inicio < 0) return null;
  const proxima = linhas.findIndex((l, i) => i > inicio && /^##\s/.test(l));
  return [inicio + 1, proxima < 0 ? linhas.length : proxima];
}

function lerIgnoradas(caminho) {
  const { linhas } = linhasDoArquivo(caminho), trecho = trechoDasIgnoradas(linhas);
  if (!trecho) return [];
  return linhas.slice(...trecho).flatMap((l) => {
    const p = l.match(IGNORADA);
    return p ? [{ repo: p[1], branch: p[2], motivo: p[3] || "" }] : [];
  });
}

function ignorarBranch(caminho, repo, branch, motivo, hoje) {
  if (lerIgnoradas(caminho).some((i) => i.repo === repo && i.branch === branch)) return true;
  const arquivo = expandir(caminho), { linhas, fimDeLinha } = linhasDoArquivo(arquivo);
  const nova = `- \`${repo}\` \`${branch}\` — ${motivo} (${hoje})`;
  const trecho = trechoDasIgnoradas(linhas);
  if (!trecho) linhas.push("", "## Ignoradas", "", nova);
  else {
    let fim = trecho[1];
    while (fim > trecho[0] && !linhas[fim - 1].trim()) fim--;   // depois do último item, antes das linhas em branco
    linhas.splice(fim, 0, nova);
  }
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, linhas.join(fimDeLinha));
  return true;
}

function voltarBranch(caminho, repo, branch) {
  const arquivo = expandir(caminho), { linhas, fimDeLinha } = linhasDoArquivo(arquivo), trecho = trechoDasIgnoradas(linhas);
  if (!trecho) return false;
  const indice = linhas.findIndex((l, i) => {
    const p = i >= trecho[0] && i < trecho[1] && l.match(IGNORADA);
    return p && p[1] === repo && p[2] === branch;
  });
  if (indice < 0) return false;
  linhas.splice(indice, 1);
  fs.writeFileSync(arquivo, linhas.join(fimDeLinha));
  return true;
}

module.exports = { lerAmbientes, lerAvisos, marcarAviso, adicionarAviso, expandir, lerIgnoradas, ignorarBranch, voltarBranch };
