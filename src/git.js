// Informações de git por repo: branch atual (lida do .git/HEAD) e commits sem push (com cache).
"use strict";
const { execFile } = require("child_process");
const { raizGit, branchAtual } = require("../hooks/registrar");

const VALIDADE_CACHE_MS = 2 * 60 * 1000;
const cache = new Map();    // "raiz|ignoradas" -> { quando, valor, emAndamento }
const ultimo = new Map();   // raiz -> último valor, mostrado enquanto a conta nova não chega
let ignoradas = new Map();  // nome do repo -> Set de branches que não contam ("*" = o repo inteiro)

function git(raiz, args) {
  return new Promise((resolve) => {
    execFile("git", ["-C", raiz, ...args], { timeout: 8000, windowsHide: true }, (erro, saida) => {
      resolve(erro ? null : String(saida).trim());
    });
  });
}

function nomeDoRepo(raiz) {
  return raiz ? raiz.split(/[\\/]/).filter(Boolean).pop() : "";
}

function definirIgnoradas(mapa) {
  ignoradas = mapa;
}

// Só as branches com commit seu sem push são contadas uma a uma (o --source acha quais são numa chamada só).
async function contarPendencias(raiz, ignorar) {
  const remotos = await git(raiz, ["remote"]);
  const email = await git(raiz, ["config", "user.email"]);
  const autor = email ? [`--author=${email}`] : [];
  const semRemoto = remotos === "";
  const fora = semRemoto ? [] : ["--not", "--remotes"];
  const fontes = await git(raiz, ["log", "--branches", ...fora, ...autor, "--source", "--format=%S"]);
  const candidatas = [...new Set((fontes || "").split("\n").filter(Boolean).map((ref) => ref.replace(/^refs\/heads\//, "")))];
  const contadas = await Promise.all(candidatas.map(async (nome) => ({
    nome, commits: Number(await git(raiz, ["rev-list", "--count", `refs/heads/${nome}`, ...fora, ...autor])) || 0,
  })));
  const todoIgnorado = ignorar.has("*");
  const branches = contadas.filter((b) => b.commits > 0)
    .map((b) => ({ ...b, ignorada: todoIgnorado || ignorar.has(b.nome) }))
    .sort((a, b) => b.commits - a.commits);
  // Commit que também está numa branch que conta continua contando.
  const validas = branches.filter((b) => !b.ignorada).map((b) => `refs/heads/${b.nome}`);
  const total = validas.length ? Number(await git(raiz, ["rev-list", "--count", ...validas, ...fora, ...autor])) || 0 : 0;
  return { semRemoto, commits: total, branches };
}

// Devolve o valor em cache na hora e agenda a atualização em segundo plano.
function pendencias(raiz, aoAtualizar) {
  const ignorar = ignoradas.get(nomeDoRepo(raiz)) || new Set();
  const chave = `${raiz}|${[...ignorar].sort().join(",")}`;
  const item = cache.get(chave);
  const vencido = !item || Date.now() - item.quando > VALIDADE_CACHE_MS;
  if (vencido && !(item && item.emAndamento)) {
    cache.set(chave, { ...(item || { valor: null }), quando: item ? item.quando : 0, emAndamento: true });
    contarPendencias(raiz, ignorar).then((valor) => {
      cache.set(chave, { quando: Date.now(), valor, emAndamento: false });
      ultimo.set(raiz, valor);
      aoAtualizar();
    });
  }
  return (item && item.valor) || ultimo.get(raiz) || null;
}

module.exports = { raizGit, branchAtual, pendencias, nomeDoRepo, definirIgnoradas };
