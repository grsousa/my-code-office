// Gera previa/index.html: o webview do painel com o retrato real desta máquina, sem precisar do VS Code.
// Uso: node scripts/previa.js [cenario]   (cenario: real | demo)
"use strict";
const fs = require("fs");
const path = require("path");
const { montarRetrato } = require("../src/retrato");
const { buscar } = require("../src/busca");

const raiz = path.join(__dirname, "..");
const destino = path.join(raiz, "previa");
const cenario = process.argv[2] || "real";
const config = { repos: (require("../src/config").lerConfigDaEntrevista() || {}).repos || [], ambientes: (process.env.AMBIENTES || "dev,tst,hmg").split(","), tituloFila: (require("../src/config").lerConfigDaEntrevista() || {}).tituloFila || (process.env.IDIOMA === "en" ? "Queue" : "Fila"), idioma: process.env.IDIOMA || "pt-BR", horasVisiveis: 24, minutosCochilo: 60, tokensCansado: 400000, arquivoAmbientes: "~/.claude/branches/estado.md", arquivoAvisos: "~/.claude/escritorio/avisos.md" };

// Demo: força um estado diferente em cada mesa para conferir todos os visuais.
function demo(retrato) {
  const estados = ["esperando", "cafe", "reuniao", "digitando", "pensando", "dormindo", "digitando", "cafe"];
  retrato.sessoes.forEach((s, i) => {
    s.estado = estados[i % estados.length];
    if (s.estado === "esperando") s.pedido = "Claude needs your permission to use Bash";
    if (s.estado === "reuniao") s.subagentes = ["Raspar páginas novas", "Reindexar no pgvector", "Rodar o eval"];
  });
  const multi = retrato.sessoes[3];
  if (multi) {
    multi.repos = [
      { nome: "repo-a", branch: "feature/painel", pendencias: { commits: 3, semRemoto: false } },
      { nome: "repo-b", branch: "main", branchVisto: "feature/painel", branchMudou: true, pendencias: { commits: 1, semRemoto: false } },
    ];
    Object.assign(multi, { repoNome: "repo-a", repo: "C:/demo/repo-a", branch: "feature/painel", mostrarPapeis: true, pendencias: multi.repos[0].pendencias, estado: "digitando" });
  }
    if (retrato.sessoes.length > 1) {
    retrato.sessoes[1].branchMudou = true;
    retrato.sessoes[1].branchVisto = "feature/outra";
    retrato.conflitos = [[retrato.sessoes[0].id, retrato.sessoes[1].id]];
  }
  return retrato;
}

function gerar(retrato, achados) {
  fs.mkdirSync(destino, { recursive: true });
  const scripts = ["textos.js", "pixel.js", "sprites.js", "ambiente.js", "cena.js", "lateral.js", "painel.js"].map((s) => `<script src="../media/${s}"></script>`).join("\n");
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><link rel="stylesheet" href="../media/escritorio.css">
<style>:root{--vscode-panel-background:#1f1f1f;--vscode-foreground:#cccccc;--vscode-font-family:"Segoe UI",sans-serif;--vscode-font-size:13px}</style></head>
<body><div class="topo"><div class="hud" id="hud"></div><input id="busca" type="search" placeholder="Buscar assunto nas conversas…"></div><div class="alerta" id="alerta"></div>
<div class="corpo"><div class="cena"><div class="palco" id="palco"><canvas id="cv" width="288" height="208"></canvas><div class="rotulos" id="rotulos"></div><div class="dica" id="dica"></div></div></div><aside class="lado" id="lado"></aside></div>
<script>window.acquireVsCodeApi=()=>({postMessage:(m)=>{if(m.type==="pronto")setTimeout(()=>window.postMessage({type:"retrato",retrato:${JSON.stringify(retrato)}},"*"),0);else if(m.type==="buscar")setTimeout(()=>window.postMessage({type:"resultadoBusca",termo:m.termo,resultados:${JSON.stringify(achados)}},"*"),200);else console.log("acao",JSON.stringify(m));},getState:()=>null,setState:()=>{}});</script>
${scripts}</body></html>`;
  fs.writeFileSync(path.join(destino, "index.html"), html);
  console.log(path.join(destino, "index.html"));
}

// A prévia responde qualquer busca com os resultados reais deste termo (padrão: "reranker").
setTimeout(async () => {
  const retrato = { ...montarRetrato(config, () => {}), arranjo: process.argv[3] || "fileiras", tituloFila: config.tituloFila, idioma: config.idioma };
  const achados = await buscar(process.argv[4] || "reranker", { limite: 6 });
  gerar(cenario === "demo" ? demo(retrato) : retrato, achados);
}, 4000);   // dá tempo para as contagens de git em segundo plano
montarRetrato(config, () => {});
