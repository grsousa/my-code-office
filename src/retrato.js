// Junta transcripts, estado gravado pelos hooks, git e arquivos de apoio num retrato do escritório.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { lerConversa, listarTranscripts } = require("./transcripts");
const { raizGit, branchAtual, pendencias, nomeDoRepo, definirIgnoradas } = require("./git");
const { lerAmbientes, lerAvisos, lerIgnoradas } = require("./quadros");

const PASTA_PROJETOS = path.join(os.homedir(), ".claude", "projects");
const PASTA_HOOKS = require("./caminhos").SESSOES;

function lerDispensadas() {
  try { return JSON.parse(fs.readFileSync(require("./caminhos").DISPENSADAS, "utf8")); } catch { return {}; }
}

function dispensar(id, atualizado) {
  const dispensadas = lerDispensadas();
  dispensadas[id] = atualizado;
  fs.mkdirSync(path.dirname(require("./caminhos").DISPENSADAS), { recursive: true });
  fs.writeFileSync(require("./caminhos").DISPENSADAS, JSON.stringify(dispensadas, null, 1));
}

function lerEstadosDosHooks() {
  const estados = new Map();
  if (!fs.existsSync(PASTA_HOOKS)) return estados;
  for (const nome of fs.readdirSync(PASTA_HOOKS)) {
    if (!nome.endsWith(".json")) continue;
    try {
      const estado = JSON.parse(fs.readFileSync(path.join(PASTA_HOOKS, nome), "utf8"));
      if (estado.id) estados.set(estado.id, estado);
    } catch { /* arquivo sendo gravado; fica para a próxima leitura */ }
  }
  return estados;
}

function nomeDaConversa(conversa) {
  const base = conversa.nomeDado || conversa.titulo || conversa.primeiroPrompt || conversa.id.slice(0, 8);
  return base.length > 42 ? `${base.slice(0, 40)}…` : base;
}

function viaQuestionFarm(conversa) {
  return /^Read .*\.not-a-proxy[\\/]questions\.json/.test(conversa.primeiroPrompt || "");
}

// Pedidos do Question Farm chegam como "Read …/.not-a-proxy/questions.json": o painel mostra "pergunta sobre <pasta>".
function pastaDoQuestionFarm(conversa) {
  const tarefa = conversa.ultimoPrompt || conversa.primeiroPrompt || "";
  const pasta = tarefa.match(/^Read .*[\\/]([^\\/]+)[\\/]\.not-a-proxy[\\/]questions\.json/);
  return pasta ? pasta[1] : null;
}

// Repos editados segundo o hook, do mais recente ao mais antigo. Registros sem "editado"
// são antigos (guardavam a pasta de abertura) e ficam de fora.
function reposDoHook(hook) {
  return Object.entries(hook.repos || {})
    .filter(([, registro]) => registro.editado)
    .map(([raiz, registro]) => ({ raiz, branchVisto: registro.branchVisto, ultimoToque: registro.ultimoToque }))
    .sort((a, b) => b.ultimoToque - a.ultimoToque);
}

// Sem hook: repos dos arquivos editados no transcript, do mais recente ao mais antigo.
function reposDoTranscript(conversa) {
  const raizDaAbertura = raizGit(conversa.cwd || "");
  const porRaiz = new Map();   // raiz -> último arquivo editado nela
  for (const arquivo of [...(conversa.arquivosEscritos || [])].reverse()) {
    const raiz = raizGit(path.dirname(arquivo));
    if (raiz && !porRaiz.has(raiz)) porRaiz.set(raiz, arquivo);
  }
  // O transcript só sabe a branch da pasta de abertura, e no momento de cada edição.
  return [...porRaiz].map(([raiz, arquivo]) => ({
    raiz, branchVisto: raiz === raizDaAbertura ? (conversa.branchDaEdicao || {})[arquivo] || null : null, ultimoToque: conversa.atualizado,
  }));
}

// Esc não dispara Stop: se o transcript registrou a interrupção depois do último evento, o turno acabou.
function estadoDoHook(conversa, hook) {
  const interrompida = conversa.interrompida && conversa.atualizado > hook.atualizado;
  if (interrompida && ["digitando", "pensando", "esperando"].includes(hook.estado)) return { estado: "cafe", desde: conversa.atualizado, pedido: null };
  return { estado: hook.estado, desde: hook.desde, pedido: hook.pedido || null };
}

// Com hook, ele é a fonte do estado, dos subagentes e dos repos; o transcript completa o resto.
function aplicarHook(conversa, hook) {
  if (!hook) return { ...conversa, fonte: "transcript" };
  return {
    ...conversa,
    fonte: "hooks",
    ...estadoDoHook(conversa, hook),
    subagentes: [...Object.values(hook.subagentes || {}), ...Object.values(hook.subagentesFundo || {}).map((s) => s.descricao)],
    ultimoPrompt: hook.ultimoPrompt || conversa.ultimoPrompt,
    reposEditados: reposDoHook(hook),
    atualizado: Math.max(conversa.atualizado, hook.atualizado),
  };
}

function aplicarCochilo(conversa, agora, minutosCochilo) {
  const parada = agora - conversa.atualizado > minutosCochilo * 60000;
  if (!parada || conversa.estado === "esperando") return conversa;
  return { ...conversa, estado: "dormindo", desde: conversa.atualizado };
}

function situacaoDoRepo(registro, conversa, aoAtualizar) {
  const branch = branchAtual(registro.raiz);
  const branchMudou = !!(registro.branchVisto && branch && registro.branchVisto !== branch && conversa.estado !== "dormindo");
  return { raiz: registro.raiz, nome: nomeDoRepo(registro.raiz), branch, branchVisto: registro.branchVisto || null, branchMudou, pendencias: pendencias(registro.raiz, aoAtualizar) };
}

// O primeiro repo da lista (o editado mais recentemente) é o principal: define tapete e papéis.
function aplicarGit(conversa, aoAtualizar, limiteMs) {
  const doHook = (conversa.reposEditados || []).filter((r) => !r.ultimoToque || r.ultimoToque >= limiteMs);
  // O hook pode ter sido ligado no meio da conversa: o que o transcript viu antes completa a lista.
  const vistos = new Set(doHook.map((r) => r.raiz));
  const registros = [...doHook, ...reposDoTranscript(conversa).filter((r) => !vistos.has(r.raiz))];
  const repos = registros.map((r) => situacaoDoRepo(r, conversa, aoAtualizar));
  const principal = repos[0];
  if (!principal) return { ...conversa, repos: [], repo: null, repoNome: "", branch: null, branchMudou: false };
  return {
    ...conversa, repos, repo: principal.raiz, repoNome: principal.nome, branch: principal.branch,
    branchVisto: principal.branchVisto, branchMudou: repos.some((r) => r.branchMudou), pendencias: principal.pendencias,
  };
}

// Esbarrão: duas conversas ativas editaram o mesmo repo (qualquer um da lista) e a branch dele mudou.
function detectarConflitos(sessoes) {
  const porRepo = new Map();
  for (const sessao of sessoes) {
    if (sessao.estado === "dormindo") continue;
    for (const repo of sessao.repos || []) porRepo.set(repo.raiz, [...(porRepo.get(repo.raiz) || []), { sessao, repo }]);
  }
  // O par é sempre a conversa afetada (a branch mudou para ela) + outra que mexe no mesmo repo.
  const conflitos = [], vistos = new Set();
  for (const grupo of porRepo.values()) {
    for (const afetada of grupo.filter((g) => g.repo.branchMudou)) {
      const outra = grupo.find((g) => g.sessao.id !== afetada.sessao.id);
      const chave = outra && [afetada.sessao.id, outra.sessao.id].sort().join("|");
      if (outra && !vistos.has(chave)) { vistos.add(chave); conflitos.push([afetada.sessao.id, outra.sessao.id]); }
    }
  }
  return conflitos;
}

function marcarDonoDosPapeis(sessoes) {
  const dono = new Map();
  for (const sessao of sessoes) {
    const atual = dono.get(sessao.repo);
    if (sessao.repo && (!atual || sessao.atualizado > atual.atualizado)) dono.set(sessao.repo, sessao);
  }
  return sessoes.map((s) => ({ ...s, mostrarPapeis: dono.get(s.repo) === s }));
}

// Correio: todos os repos acompanhados (da entrevista) mais os das conversas; só entram os com commit sem push.
function montarCorreio(sessoes, acompanhados, aoAtualizar, ignoradas) {
  const repos = new Map();
  for (const pasta of acompanhados || []) {
    const raiz = raizGit(pasta), p = raiz && pendencias(raiz, aoAtualizar);
    if (p) repos.set(raiz, { nome: nomeDoRepo(raiz), ...p });
  }
  for (const sessao of sessoes) {
    for (const repo of sessao.repos || []) if (repo.pendencias) repos.set(repo.raiz, { nome: repo.nome, ...repo.pendencias });
  }
  const lista = [...repos.values()].filter((r) => r.commits > 0).sort((a, b) => b.commits - a.commits);
  return { commits: lista.reduce((soma, r) => soma + r.commits, 0), repos: lista, ignoradas };
}

function paraOPainel(conversa) {
  return {
    id: conversa.id, nome: nomeDaConversa(conversa), titulo: conversa.titulo || conversa.primeiroPrompt,
    estado: conversa.estado, desde: conversa.desde || conversa.atualizado, atualizado: conversa.atualizado,
    pedido: conversa.pedido || null, subagentes: conversa.subagentes || [], fonte: conversa.fonte,
    cwd: conversa.cwd, repo: conversa.repo, repoNome: conversa.repoNome, branch: conversa.branch,
    branchVisto: conversa.branchVisto, branchMudou: conversa.branchMudou,
    repos: (conversa.repos || []).map(({ nome, branch, branchVisto, branchMudou, pendencias: p }) => ({ nome, branch, branchVisto, branchMudou, pendencias: p })),
    tarefa: conversa.ultimoPrompt || conversa.primeiroPrompt, tarefaQuestionFarm: pastaDoQuestionFarm(conversa), ultimaResposta: conversa.ultimaResposta,
    tokens: conversa.tokens, pendencias: conversa.pendencias || null,
    via: viaQuestionFarm(conversa) ? "Question Farm" : null, transcript: conversa.transcript,
  };
}

function montarRetrato(config, aoAtualizar) {
  const agora = Date.now();
  const hooks = lerEstadosDosHooks();
  const desde = agora - config.horasVisiveis * 3600000;
  const sessoes = [], brutos = [];   // brutos: repos com a raiz completa, para o esbarrão
  const dispensadas = lerDispensadas();
  const ignoradas = lerIgnoradas(config.arquivoAmbientes);
  definirIgnoradas(ignoradas.reduce((mapa, i) => mapa.set(i.repo, (mapa.get(i.repo) || new Set()).add(i.branch)), new Map()));
  for (const { arquivo, mtime } of listarTranscripts(PASTA_PROJETOS, desde)) {
    const id = path.basename(arquivo, ".jsonl"), hook = hooks.get(id);
    if (hook && hook.estado === "encerrada") continue;
    if (dispensadas[id] && Math.max(mtime, hook ? hook.atualizado : 0) <= dispensadas[id]) continue;
    let conversa;
    try { conversa = lerConversa(arquivo); } catch { continue; }
    conversa = aplicarCochilo(aplicarHook(conversa, hook), agora, config.minutosCochilo);
    const comGit = aplicarGit(conversa, aoAtualizar, desde);
    brutos.push(comGit.repos);
    sessoes.push(paraOPainel(comGit));
  }
  return {
    agora, sessoes: marcarDonoDosPapeis(sessoes),
    conflitos: detectarConflitos(sessoes.map((s, i) => ({ ...s, repos: brutos[i] }))),
    correio: montarCorreio(sessoes.map((s, i) => ({ ...s, repos: brutos[i] })), config.repos, aoAtualizar, ignoradas.map(({ repo, branch }) => ({ repo, branch }))),
    ambientes: lerAmbientes(config.arquivoAmbientes, config.ambientes),
    avisos: lerAvisos(config.arquivoAvisos),
    tokensCansado: config.tokensCansado,
    comHooks: hooks.size > 0,
  };
}

module.exports = { dispensar, montarRetrato, detectarConflitos, aplicarCochilo, aplicarHook };
