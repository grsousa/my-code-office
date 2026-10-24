#!/usr/bin/env node
// Configurador do My Code Office, chamado pela entrevista (/my-code-office).
//   node aplicar.js --detectar [--pasta X]            -> JSON com o que dá para descobrir sozinho
//   node aplicar.js <respostas.json>                   -> backup + gera skills, ambientes, avisos, hooks e config
//   node aplicar.js --restaurar <pasta-do-backup>      -> desfaz uma aplicação
//   node aplicar.js --instalar-setup [pt-BR|en]        -> instala a skill da entrevista
//   node aplicar.js --migrar                           -> traz a configuração do nome antigo (Escritório das Conversas)
"use strict";
const fs = require("fs");
const path = require("path");
const hooks = require("./hooks");
const { detectar } = require("./detectar");
const C = require("../src/caminhos");

const PROJETO = path.join(__dirname, "..");
const IDIOMAS = ["pt-BR", "en"];
const SKILL_DE_BUSCA = { "pt-BR": "conversa", en: "conversation" };
const SKILL_DE_AVISO = { "pt-BR": "aviso", en: "notice" };
const barra = (p) => p.replace(/\\/g, "/");
const expandir = (p) => (p.startsWith("~") ? path.join(require("os").homedir(), p.slice(1)) : p);
const hoje = () => new Date().toISOString().slice(0, 10);
const carimbo = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

// Textos que o configurador escreve dentro dos arquivos gerados.
const FRASES = {
  "pt-BR": {
    contexto: (r) => `O time tem ${r.tamanhoTime || "algumas"} pessoas e ${r.ambientes.length} ambiente(s) de teste (${r.ambientes.join(", ")}), combinados ${r.combinado || "entre vocês"}. Por isso muita branch fica local esperando a vez.`,
    semAmbientes: "O time não divide ambientes de teste.", semAmbientesCurto: "(sem ambientes compartilhados)",
    fetchSim: "Pode rodar `git fetch --all --prune` antes do relatório quando o último fetch tiver mais de 1 dia. **Nunca faça push.**",
    fetchNao: "**Não fazer `git fetch` nem `push`**: isso fica com a pessoa. O remoto vale até o `ultimo_fetch` de cada repo; se tiver mais de 1 dia, avisar e sugerir `git fetch --all --prune`.",
    titulo: (r) => ({ gestora: "Fila da gestora", gestor: "Fila do gestor" }[r.tratamento] || `Fila de ${r.nome}`),
    gatilho: (a) => ` "${a}, como estão minhas branches?",`, gatilhoBusca: (a) => ` "${a}, acha a conversa sobre X",`, gatilhoAviso: (a) => ` "${a}, põe no mural: X",`,
    avisos: '# Quadro de avisos\n\nUm aviso por linha: "- [ ] texto" pendente, "- [x] texto" feito. Dá para marcar direto no painel.\n\n',
    estado: (tabela) => `# Estado das branches — ambientes e notas\n\nMantido pela skill \`/branches\`.\n\n## Ambientes\n\n${tabela}\n\n## Notas por branch\n\n## Ignoradas\n\n## Histórico\n`,
    cabecalho: "| Ambiente | Ocupado por | Branch(es) | Desde | Observação |", eOutros: " e outros",
  },
  en: {
    contexto: (r) => `The team has ${r.tamanhoTime || "a few"} people and ${r.ambientes.length} test environment(s) (${r.ambientes.join(", ")}), coordinated ${r.combinado || "among yourselves"}. That's why many branches stay local waiting for their turn.`,
    semAmbientes: "The team doesn't share test environments.", semAmbientesCurto: "(no shared environments)",
    fetchSim: "You may run `git fetch --all --prune` before the report when the last fetch is more than 1 day old. **Never push.**",
    fetchNao: "**Don't run `git fetch` or `push`**: that is up to the person. The remote is as fresh as each repo's `ultimo_fetch`; if it's more than 1 day old, warn and suggest `git fetch --all --prune`.",
    titulo: (r) => ({ gestora: "Manager's queue", gestor: "Manager's queue" }[r.tratamento] || `${r.nome}'s queue`),
    gatilho: (a) => ` "${a}, how are my branches?",`, gatilhoBusca: (a) => ` "${a}, find the conversation about X",`, gatilhoAviso: (a) => ` "${a}, put X on the board",`,
    avisos: '# Notice board\n\nOne notice per line: "- [ ] text" pending, "- [x] text" done. You can check them off in the panel.\n\n',
    estado: (tabela) => `# Branches status — environments and notes\n\nKept by the \`/branches\` skill.\n\n## Ambientes\n\n${tabela}\n\n## Notas por branch\n\n## Ignoradas\n\n## Histórico\n`,
    cabecalho: "| Environment | Taken by | Branch(es) | Since | Notes |", eOutros: " and others",
  },
};

// Tudo o que a aplicação pode tocar; o backup guarda o que existia e anota o que não existia.
const ALVOS = {
  "skill-branches": path.join(C.SKILLS, "branches"),
  "skill-conversa": path.join(C.SKILLS, "conversa"),
  "skill-conversation": path.join(C.SKILLS, "conversation"),
  "skill-aviso": path.join(C.SKILLS, "aviso"),
  "skill-notice": path.join(C.SKILLS, "notice"),
  "estado.md": C.ESTADO_BRANCHES,
  "avisos.md": C.AVISOS,
  "config.json": C.CONFIG,
  "claude-settings.json": hooks.ARQUIVO,
};

function preencher(idioma, modelo, valores) {
  const doIdioma = path.join(__dirname, "modelos", idioma, modelo);
  const arquivo = fs.existsSync(doIdioma) ? doIdioma : path.join(__dirname, "modelos", modelo);
  return fs.readFileSync(arquivo, "utf8").replace(/\{\{(\w+)\}\}/g, (_, chave) => (chave in valores ? valores[chave] : `{{${chave}}}`));
}

function gravar(arquivo, conteudo) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, conteudo);
}

function fazerBackup() {
  const pasta = path.join(C.BACKUPS, `aplicacao_${carimbo()}`);
  const manifesto = {};
  for (const [nome, alvo] of Object.entries(ALVOS)) {
    manifesto[nome] = { alvo, existia: fs.existsSync(alvo) };
    if (manifesto[nome].existia) fs.cpSync(alvo, path.join(pasta, nome), { recursive: true });
  }
  gravar(path.join(pasta, "manifesto.json"), JSON.stringify(manifesto, null, 1));
  return pasta;
}

function restaurar(pasta) {
  const manifesto = JSON.parse(fs.readFileSync(path.join(pasta, "manifesto.json"), "utf8"));
  for (const [nome, { alvo, existia }] of Object.entries(manifesto)) {
    fs.rmSync(alvo, { recursive: true, force: true });
    if (existia) fs.cpSync(path.join(pasta, nome), alvo, { recursive: true });
  }
  console.log(`Restaurado a partir de ${barra(pasta)}. Rode "Developer: Reload Window" no VS Code.`);
}

// Ferramentas copiadas para um lugar fixo: atualizar a extensão não quebra skills nem hooks.
function copiarFerramentas() {
  gravar(path.join(C.FERRAMENTAS, "src", "busca.js"), fs.readFileSync(path.join(PROJETO, "src", "busca.js")));
  gravar(path.join(C.FERRAMENTAS, "bin", "buscar.js"), fs.readFileSync(path.join(PROJETO, "bin", "buscar.js")));
  for (const arquivo of ["src/quadros.js", "src/caminhos.js", "bin/aviso.js"]) gravar(path.join(C.FERRAMENTAS, arquivo), fs.readFileSync(path.join(PROJETO, arquivo)));
  gravar(C.HOOK, fs.readFileSync(path.join(PROJETO, "hooks", "registrar.js")));
  return { busca: barra(path.join(C.FERRAMENTAS, "bin", "buscar.js")), aviso: barra(path.join(C.FERRAMENTAS, "bin", "aviso.js")), registrar: barra(C.HOOK) };
}

function valoresComuns(r, ferramentas) {
  const f = FRASES[r.idioma], apelido = (r.apelido || "").trim();
  const nomeApelido = apelido ? apelido[0].toUpperCase() + apelido.slice(1) : "";
  return {
    NOME: r.nome, DATA: hoje(), FUSO: r.fuso || Intl.DateTimeFormat().resolvedOptions().timeZone,
    APELIDO_DESC: nomeApelido ? `${nomeApelido} — ` : "",
    APELIDO_GATILHO: apelido ? f.gatilho(apelido) : "", APELIDO_GATILHO_CONVERSA: apelido ? f.gatilhoBusca(apelido) : "",
    APELIDO_GATILHO_AVISO: apelido ? f.gatilhoAviso(apelido) : "",
    SCRIPT_BUSCA: ferramentas.busca, SCRIPT_AVISO: ferramentas.aviso, AVISOS_MD: barra(C.AVISOS),
  };
}

function escreverBranches(r, comuns) {
  const f = FRASES[r.idioma], ambientes = r.ambientes.length ? r.ambientes : [f.semAmbientesCurto];
  const pastaSkill = ALVOS["skill-branches"];
  gravar(path.join(pastaSkill, "SKILL.md"), preencher(r.idioma, "branches.SKILL.md", {
    ...comuns, REPOS_CURTO: r.repos.map((p) => path.basename(p)).slice(0, 5).join(", ") + (r.repos.length > 5 ? f.eOutros : ""),
    AMBIENTES_BARRA: ambientes.join("/"), AMBIENTE_EXEMPLO: ambientes[0], CONTEXTO_TIME: r.ambientes.length ? f.contexto(r) : f.semAmbientes,
    SCRIPT_COLETA: barra(path.join(pastaSkill, "scripts", "coletar.sh")), ESTADO_MD: barra(C.ESTADO_BRANCHES),
    REGRA_FETCH: r.podeFetch ? f.fetchSim : f.fetchNao,
  }));
  gravar(path.join(pastaSkill, "scripts", "coletar.sh"), preencher(r.idioma, "branches.coletar.sh", { ...comuns, REPOS_BASH: r.repos.map((p) => `"${barra(p)}"`).join(" ") }));
}

// A skill de busca tem nome no idioma escolhido; a do outro idioma sai.
function escreverBusca(r, comuns) {
  for (const [idioma, nome] of Object.entries(SKILL_DE_BUSCA)) if (idioma !== r.idioma) fs.rmSync(path.join(C.SKILLS, nome), { recursive: true, force: true });
  gravar(path.join(C.SKILLS, SKILL_DE_BUSCA[r.idioma], "SKILL.md"), preencher(r.idioma, "conversa.SKILL.md", comuns));
}

// Skill do quadro de avisos (/aviso ou /notice), também no idioma escolhido.
function escreverAviso(r, comuns) {
  for (const [idioma, nome] of Object.entries(SKILL_DE_AVISO)) if (idioma !== r.idioma) fs.rmSync(path.join(C.SKILLS, nome), { recursive: true, force: true });
  gravar(path.join(C.SKILLS, SKILL_DE_AVISO[r.idioma], "SKILL.md"), preencher(r.idioma, "aviso.SKILL.md", comuns));
}

// Tabela de ambientes: mantém o que já estava registrado para os ambientes que continuam.
function escreverEstado(r) {
  const arquivo = C.ESTADO_BRANCHES, f = FRASES[r.idioma];
  const atual = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, "utf8") : "";
  const linhaDe = (nome) => atual.split("\n").find((l) => l.trim().toLowerCase().startsWith(`| ${nome.toLowerCase()} |`)) || `| ${nome} | ? | ? | ? | |`;
  const cabecalhoAtual = atual.match(/^\|[^\n]*\|\s*$/m);
  const tabela = [cabecalhoAtual ? cabecalhoAtual[0].trim() : f.cabecalho, "|---|---|---|---|---|", ...r.ambientes.map(linhaDe)].join("\n");
  if (atual.includes("## Ambientes")) return gravar(arquivo, atual.replace(/## Ambientes\n[\s\S]*?(?=\n## |\s*$)/, `## Ambientes\n\n${tabela}\n`));
  gravar(arquivo, f.estado(tabela));
}

function escreverAvisos(r) {
  const arquivo = C.AVISOS;
  const atual = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, "utf8") : FRASES[r.idioma].avisos;
  const novos = (r.avisos || []).filter((a) => a.trim() && !atual.includes(a.trim())).map((a) => `- [ ] ${a.trim()}`);
  gravar(arquivo, atual.replace(/\n*$/, "\n") + (novos.length ? `${novos.join("\n")}\n` : ""));
}

function escreverConfig(r) {
  const config = { versao: 1, idioma: r.idioma, nome: r.nome, apelido: r.apelido || null, tituloFila: r.tituloFila || FRASES[r.idioma].titulo(r), ambientes: r.ambientes.slice(0, 4), arranjo: r.arranjo || "fileiras", repos: r.repos.map(barra), geradoEm: new Date().toISOString() };
  gravar(C.CONFIG, JSON.stringify(config, null, 1));
}

function validar(r) {
  const faltando = ["nome", "repos", "ambientes"].filter((c) => r[c] == null);
  if (faltando.length) throw new Error(`Faltam respostas: ${faltando.join(", ")}`);
  r.idioma = IDIOMAS.includes(r.idioma) ? r.idioma : "pt-BR";
  r.repos = r.repos.map(expandir).filter((p) => fs.existsSync(p));
  if (!r.repos.length) throw new Error("Nenhum dos repos informados existe nesta máquina.");
  r.ambientes = r.ambientes.map((a) => String(a).trim().toLowerCase()).filter(Boolean).slice(0, 4);
  return r;
}

function aplicar(arquivoRespostas, { silencioso = false } = {}) {
  const respostas = validar(JSON.parse(fs.readFileSync(expandir(arquivoRespostas), "utf8")));
  const backup = fazerBackup();
  const ferramentas = copiarFerramentas();
  const comuns = valoresComuns(respostas, ferramentas);
  escreverBranches(respostas, comuns);
  escreverBusca(respostas, comuns);
  escreverAviso(respostas, comuns);
  if (respostas.ambientes.length) escreverEstado(respostas);
  escreverAvisos(respostas);
  escreverConfig(respostas);
  if (respostas.hooks) hooks.instalar(ferramentas.registrar); else hooks.remover();
  gravar(C.RESPOSTAS, JSON.stringify(respostas, null, 1));
  instalarSetup(respostas.idioma);
  const resultado = { ok: true, backup: barra(backup), desfazer: `node "${barra(__filename)}" --restaurar "${barra(backup)}"`, hooks: hooks.status(), criados: Object.values(ALVOS).filter((a) => fs.existsSync(a)).map(barra) };
  if (!silencioso) console.log(JSON.stringify(resultado, null, 1));
  return resultado;
}

function instalarSetup(idioma = "pt-BR") {
  fs.rmSync(path.join(C.SKILLS, "escritorio-boas-vindas"), { recursive: true, force: true });   // nome antigo
  const destino = path.join(C.SKILLS, "my-code-office", "SKILL.md");
  gravar(destino, preencher(IDIOMAS.includes(idioma) ? idioma : "pt-BR", "setup.SKILL.md", { APLICAR: barra(__filename) }));
  return destino;
}

// Nome antigo (~/.claude/escritorio): copia tudo para a pasta nova, refaz hooks e skills e guarda a antiga com data.
function migrar() {
  if (!fs.existsSync(C.PASTA_ANTIGA) || fs.existsSync(C.CONFIG)) return { migrou: false };
  fs.cpSync(C.PASTA_ANTIGA, C.PASTA, { recursive: true, force: false, errorOnExist: false });
  fs.rmSync(path.join(C.PASTA, "hooks"), { recursive: true, force: true });
  fs.rmSync(path.join(C.PASTA, "ferramentas"), { recursive: true, force: true });
  if (fs.existsSync(C.RESPOSTAS)) aplicar(C.RESPOSTAS, { silencioso: true });
  else if (hooks.status().length) hooks.instalar(copiarFerramentas().registrar);
  const antiga = `${C.PASTA_ANTIGA}.migrado-${hoje()}`;
  try { fs.renameSync(C.PASTA_ANTIGA, antiga); } catch { return { migrou: true, antiga: barra(C.PASTA_ANTIGA) }; }   // em uso (extensão antiga aberta): fica onde está
  return { migrou: true, antiga: barra(antiga) };
}

if (require.main === module) {
  const [primeiro, segundo, terceiro] = process.argv.slice(2);
  try {
    if (primeiro === "--detectar") console.log(JSON.stringify(detectar(segundo === "--pasta" ? terceiro : null), null, 1));
    else if (primeiro === "--restaurar") restaurar(path.resolve(segundo));
    else if (primeiro === "--instalar-setup") console.log(`Skill instalada em ${barra(instalarSetup(segundo))}`);
    else if (primeiro === "--migrar") console.log(JSON.stringify(migrar(), null, 1));
    else if (primeiro) aplicar(primeiro);
    else console.error("Uso: node aplicar.js --detectar | <respostas.json> | --restaurar <pasta> | --instalar-setup [pt-BR|en] | --migrar");
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    process.exitCode = 1;
  }
}

module.exports = { aplicar, restaurar, instalarSetup, migrar, detectar, copiarFerramentas, escreverAviso, valoresComuns };
