#!/usr/bin/env node
// Hook do Claude Code (My Code Office): grava o estado de cada conversa em ~/.claude/my-code-office/sessoes/<id>.json.
// Nunca bloqueia a sessão: qualquer erro é engolido e o processo sai com código 0.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");

const PASTA = process.env.MCO_PASTA_SESSOES || path.join(os.homedir(), ".claude", "my-code-office", "sessoes");
const FERRAMENTAS_SUBAGENTE = new Set(["Task", "Agent"]);
const CAMPOS_DE_ARQUIVO = ["file_path", "notebook_path"];
// Só quem escreve muda o repo da mesa; leituras de consulta em outro repo não contam.
const FERRAMENTAS_DE_ESCRITA = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const ERROS_DE_ARQUIVO_OCUPADO = new Set(["EPERM", "EBUSY", "EACCES"]);
const VALIDADE_TRAVA_MS = 2000;

const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Arquivo inexistente é estado vazio; qualquer outro erro aborta para não apagar o estado bom.
function lerEstado(arquivo) {
  try {
    return JSON.parse(fs.readFileSync(arquivo, "utf8"));
  } catch (erro) {
    if (erro.code === "ENOENT") return {};
    throw erro;
  }
}

function renomearComPersistencia(origem, destino) {
  for (let tentativa = 0; ; tentativa++) {
    try { return fs.renameSync(origem, destino); } catch (erro) {
      if (tentativa >= 5 || !ERROS_DE_ARQUIVO_OCUPADO.has(erro.code)) throw erro;
      dormir(15);   // no Windows o destino pode estar aberto pela extensão por um instante
    }
  }
}

function gravarAtomico(arquivo, dados) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const temporario = `${arquivo}.${process.pid}.tmp`;
  fs.writeFileSync(temporario, JSON.stringify(dados, null, 1));
  try { renomearComPersistencia(temporario, arquivo); } catch (erro) {
    fs.rmSync(temporario, { force: true });
    throw erro;
  }
}

// Eventos da mesma conversa podem chegar juntos (ferramentas em paralelo); cada um espera a vez.
function comTrava(arquivo, fazer) {
  const trava = `${arquivo}.lock`;
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  for (let tentativa = 0; tentativa < 100; tentativa++) {
    try {
      fs.closeSync(fs.openSync(trava, "wx"));
      try { return fazer(); } finally { fs.rmSync(trava, { force: true }); }
    } catch (erro) {
      if (erro.code !== "EEXIST") throw erro;
      if (Date.now() - fs.statSync(trava, { throwIfNoEntry: false })?.mtimeMs > VALIDADE_TRAVA_MS) fs.rmSync(trava, { force: true });
      dormir(10);
    }
  }
  throw new Error("trava ocupada");
}

// No Windows a mesma pasta chega como "c:\..." ou "C:\..."; padroniza a letra do drive.
function normalizar(caminho) {
  const absoluto = path.resolve(caminho);
  return /^[a-z]:/.test(absoluto) ? absoluto[0].toUpperCase() + absoluto.slice(1) : absoluto;
}

function raizGit(inicio) {
  let atual = normalizar(inicio);
  for (let i = 0; i < 40; i++) {
    if (fs.existsSync(path.join(atual, ".git"))) return atual;
    const pai = path.dirname(atual);
    if (pai === atual) return null;
    atual = pai;
  }
  return null;
}

function pastaGit(raiz) {
  const ponto = path.join(raiz, ".git");
  if (fs.statSync(ponto).isDirectory()) return ponto;
  const conteudo = fs.readFileSync(ponto, "utf8").trim();   // worktree: "gitdir: <caminho>"
  return path.resolve(raiz, conteudo.replace(/^gitdir:\s*/, ""));
}

function branchAtual(raiz) {
  try {
    const head = fs.readFileSync(path.join(pastaGit(raiz), "HEAD"), "utf8").trim();
    return head.startsWith("ref: refs/heads/") ? head.slice(16) : `(destacado ${head.slice(0, 7)})`;
  } catch {
    return null;
  }
}

function arquivoTocado(entrada) {
  if (!FERRAMENTAS_DE_ESCRITA.has(entrada.tool_name)) return null;
  const ferramenta = entrada.tool_input || {};
  const campo = CAMPOS_DE_ARQUIVO.find((nome) => typeof ferramenta[nome] === "string");
  return campo ? ferramenta[campo] : null;
}

// Commit feito pelo terminal (Bash/PowerShell) também conta como edição do repo: segue os "cd" do comando
// e o "git -C" para achar a pasta. Ex.: cd /c/repo && git add . && git commit -m "x"
const FERRAMENTAS_DE_TERMINAL = new Set(["Bash", "PowerShell"]);
const GIT_QUE_GRAVA = /\bgit\b((?:\s+-[cC]\s+(?:"[^"]*"|'[^']*'|\S+))*)\s+(?:commit|merge|cherry-pick|revert|am|apply|rebase)\b/;

function pastaDoTrecho(texto, base) {
  let alvo = texto.trim().replace(/^["']|["']$/g, "");
  if (!alvo) return base;
  if (alvo.startsWith("~")) alvo = path.join(os.homedir(), alvo.slice(1));
  const msys = /^\/([a-zA-Z])(\/|$)/.exec(alvo);
  if (msys) alvo = `${msys[1].toUpperCase()}:/${alvo.slice(3)}`;
  return path.resolve(base, alvo);
}

function pastasCommitadas(entrada) {
  if (!FERRAMENTAS_DE_TERMINAL.has(entrada.tool_name)) return [];
  const comando = String((entrada.tool_input || {}).command || "");
  if (!/\bgit\b/.test(comando)) return [];
  let base = entrada.cwd || process.cwd();
  const pastas = [];
  for (const trecho of comando.split(/&&|\|\||;|\n/)) {
    const cd = /^\s*(?:cd|Set-Location|pushd)\s+(.+?)\s*$/i.exec(trecho);
    if (cd) { base = pastaDoTrecho(cd[1], base); continue; }
    const git = GIT_QUE_GRAVA.exec(trecho);
    if (!git) continue;
    const opcaoC = /\s-C\s+("[^"]*"|'[^']*'|\S+)/.exec(git[1] || "");
    pastas.push(opcaoC ? pastaDoTrecho(opcaoC[1], base) : base);
  }
  return pastas;
}

// A branch vista acompanha cada edição: se a própria conversa trocou de branch e seguiu editando, aceitou a nova.
function registrarRepo(estado, alvo, agora) {
  if (!alvo) return;
  const base = fs.existsSync(alvo) && fs.statSync(alvo).isDirectory() ? alvo : path.dirname(alvo);
  const raiz = raizGit(base);
  if (!raiz) return;
  estado.repos = estado.repos || {};
  const conhecido = estado.repos[raiz] && estado.repos[raiz].editado ? estado.repos[raiz] : { primeiroToque: agora };
  estado.repos[raiz] = { ...conhecido, branchVisto: branchAtual(raiz), ultimoToque: agora, editado: true };
  estado.repoAtual = raiz;
}

function mudarEstado(estado, novo, agora) {
  if (estado.estado !== novo) estado.desde = agora;
  estado.estado = novo;
}

const temReuniao = (estado) => Object.keys(estado.subagentes || {}).length + Object.keys(estado.subagentesFundo || {}).length > 0;
const VALIDADE_FUNDO_MS = 2 * 3600000;   // agente em segundo plano sem SubagentStop some depois disso

function estadoAposFerramenta(estado) {
  return temReuniao(estado) ? "reuniao" : "digitando";
}

// Subagente em segundo plano: o PostToolUse chega na hora (só disparou); ele sai no SubagentStop.
function abrirSubagente(estado, entrada, agora) {
  const parametros = entrada.tool_input || {};
  const id = entrada.tool_use_id || String(agora), descricao = parametros.description || "subagente";
  if (parametros.run_in_background === false) estado.subagentes = { ...(estado.subagentes || {}), [id]: descricao };
  else estado.subagentesFundo = { ...(estado.subagentesFundo || {}), [id]: { descricao, desde: agora } };
}

function fecharSubagenteDeFundo(estado, entrada) {
  const fundo = { ...(estado.subagentesFundo || {}) };
  const porId = Object.keys(fundo).find((id) => Object.values(entrada).includes(id));
  delete fundo[porId || Object.keys(fundo)[0]];   // sem id que case, sai o mais antigo
  estado.subagentesFundo = fundo;
}

function descartarFundoVencido(estado, agora) {
  const fundo = Object.entries(estado.subagentesFundo || {}).filter(([, s]) => agora - s.desde < VALIDADE_FUNDO_MS);
  estado.subagentesFundo = Object.fromEntries(fundo);
}

const TRATADORES = {
  SessionStart(estado, entrada, agora) {
    estado.inicio = estado.inicio || agora;
    if (entrada.source === "compact") return;   // compactação no meio do turno: a conversa segue trabalhando
    estado.subagentes = {};
    estado.subagentesFundo = {};   // subagente em segundo plano não sobrevive ao reinício da sessão
    estado.turnoAtivo = false;
    mudarEstado(estado, "cafe", agora);
  },
  UserPromptSubmit(estado, entrada, agora) {
    const prompt = String(entrada.prompt || "").slice(0, 300);
    estado.primeiroPrompt = estado.primeiroPrompt || prompt;
    estado.ultimoPrompt = prompt;
    estado.pedido = null;
    estado.turnoAtivo = true;
    mudarEstado(estado, "pensando", agora);
  },
  PreToolUse(estado, entrada, agora) {
    estado.ferramenta = entrada.tool_name || null;
    estado.pedido = null;
    if (FERRAMENTAS_SUBAGENTE.has(entrada.tool_name)) abrirSubagente(estado, entrada, agora);
    registrarRepo(estado, arquivoTocado(entrada), agora);
    mudarEstado(estado, estadoAposFerramenta(estado), agora);
  },
  PostToolUse(estado, entrada, agora) {
    if (FERRAMENTAS_SUBAGENTE.has(entrada.tool_name) && estado.subagentes) delete estado.subagentes[entrada.tool_use_id];
    for (const pasta of pastasCommitadas(entrada)) registrarRepo(estado, pasta, agora);
    estado.pedido = null;   // a ferramenta rodou: a permissão foi dada
    mudarEstado(estado, estadoAposFerramenta(estado), agora);
  },
  Notification(estado, entrada, agora) {
    const mensagem = String(entrada.message || "");
    if (/waiting for your input|aguardando/i.test(mensagem)) return;   // aviso de ociosidade após o Stop
    estado.pedido = mensagem.slice(0, 300);
    mudarEstado(estado, "esperando", agora);
  },
  Stop(estado, entrada, agora) {
    estado.pedido = null;
    estado.subagentes = {};
    estado.turnoAtivo = false;
    mudarEstado(estado, temReuniao(estado) ? "reuniao" : "cafe", agora);
  },
  SubagentStop(estado, entrada, agora) {
    fecharSubagenteDeFundo(estado, entrada);
    if (estado.estado === "reuniao" && !temReuniao(estado)) mudarEstado(estado, estado.turnoAtivo ? "digitando" : "cafe", agora);
  },
  SessionEnd(estado, entrada, agora) {
    mudarEstado(estado, "encerrada", agora);
  },
};

function aplicarEvento(estado, entrada, agora) {
  const tratar = TRATADORES[entrada.hook_event_name];
  if (!tratar) return estado;
  const novo = { ...estado, id: entrada.session_id, cwd: entrada.cwd || estado.cwd, transcript: entrada.transcript_path || estado.transcript };
  descartarFundoVencido(novo, agora);
  tratar(novo, entrada, agora);
  novo.evento = entrada.hook_event_name;
  novo.atualizado = agora;
  return novo;
}

function principal(texto) {
  const entrada = JSON.parse(texto);
  if (!entrada.session_id || !/^[\w-]+$/.test(entrada.session_id)) return;
  const arquivo = path.join(PASTA, `${entrada.session_id}.json`);
  comTrava(arquivo, () => gravarAtomico(arquivo, aplicarEvento(lerEstado(arquivo), entrada, Date.now())));
}

if (require.main === module) {
  let texto = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (parte) => { texto += parte; });
  process.stdin.on("end", () => {
    try { principal(texto); } catch { /* o hook nunca pode atrapalhar a sessão */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}

module.exports = { pastasCommitadas, aplicarEvento, raizGit, branchAtual, comTrava };
