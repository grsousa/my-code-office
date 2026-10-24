#!/usr/bin/env node
// Quadro de avisos do My Code Office pela linha de comando (é o que a skill /aviso usa).
// Uso: node bin/aviso.js listar | novo "texto" | feito <nº ou trecho> | reabrir <nº ou trecho> [--arquivo caminho]
"use strict";
const { lerAvisos, marcarAviso, adicionarAviso } = require("../src/quadros");
const caminhos = require("../src/caminhos");

const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function opcoes(argv) {
  const i = argv.indexOf("--arquivo");
  const arquivo = i >= 0 ? argv[i + 1] : caminhos.AVISOS;
  const resto = argv.filter((_, j) => i < 0 || (j !== i && j !== i + 1));
  return { acao: resto[0], texto: resto.slice(1).join(" ").trim(), arquivo };
}

const linhaDoAviso = (a, n) => `${n}. [${a.feito ? "x" : " "}] ${a.texto}`;

// Acha um aviso pelo número de "listar" ou por um trecho do texto (sem ligar para acento e maiúscula).
function escolher(avisos, alvo, feito) {
  if (/^\d+$/.test(alvo)) {
    const a = avisos[Number(alvo) - 1];
    return a ? [a] : [];
  }
  const trecho = semAcento(alvo);
  return avisos.filter((a) => a.feito === feito && semAcento(a.texto).includes(trecho));
}

function principal(argv) {
  const { acao, texto, arquivo } = opcoes(argv);
  const avisos = lerAvisos(arquivo);
  if (acao === "listar") {
    console.log(avisos.length ? avisos.map((a, i) => linhaDoAviso(a, i + 1)).join("\n") : "(quadro vazio)");
    return 0;
  }
  if (acao === "novo") {
    if (!texto) { console.error("Faltou o texto do aviso."); return 1; }
    const novo = adicionarAviso(arquivo, texto);
    console.log(novo ? `Aviso criado: ${texto}` : `Já existe um aviso pendente com esse texto: ${texto}`);
    return 0;
  }
  if (acao === "feito" || acao === "reabrir") {
    const feito = acao === "feito";
    const achados = escolher(avisos, texto, !feito);
    if (achados.length !== 1) {
      console.error(achados.length ? "Mais de um aviso combina; seja mais específico ou use o número:" : "Nenhum aviso combina. Os avisos são:");
      console.error((achados.length ? achados : avisos).map((a) => linhaDoAviso(a, avisos.indexOf(a) + 1)).join("\n") || "(quadro vazio)");
      return 1;
    }
    const [a] = achados;
    if (!marcarAviso(arquivo, a.linha, a.texto, feito)) { console.error("O arquivo mudou no meio; tente de novo."); return 1; }
    console.log(`${feito ? "Marcado como feito" : "Reaberto"}: ${a.texto}`);
    return 0;
  }
  console.error('Uso: node aviso.js listar | novo "texto" | feito <nº ou trecho> | reabrir <nº ou trecho> [--arquivo caminho]');
  return 1;
}

process.exitCode = principal(process.argv.slice(2));
