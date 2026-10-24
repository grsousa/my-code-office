#!/usr/bin/env node
// Uso: node bin/buscar.js "assunto" [--limite N] [--incluir-atual]
// Lista as conversas que trataram do assunto, da mais recente para a mais antiga.
// Por padrão ignora a conversa atual (CLAUDE_CODE_SESSION_ID), que sempre contém o termo pesquisado.
"use strict";
const { buscar } = require("../src/busca");

function opcoes(argv) {
  const termo = argv.filter((a, i) => !a.startsWith("--") && !(argv[i - 1] || "").startsWith("--limite")).join(" ");
  const posLimite = argv.indexOf("--limite");
  const limite = posLimite >= 0 ? Number(argv[posLimite + 1]) || 10 : 5;
  const atual = process.env.CLAUDE_CODE_SESSION_ID;
  const excluir = argv.includes("--incluir-atual") || !atual ? [] : [atual];
  return { termo, limite, excluir };
}

function formatar(r, i) {
  const quando = r.quando ? r.quando.slice(0, 16).replace("T", " ") + " UTC" : "data desconhecida";
  return [
    `${i + 1}. ${r.titulo}`,
    `   última menção: ${quando} · ${r.vezes} mensagem(ns) · por ${r.quem === "user" ? "você" : "Claude"}`,
    `   trecho: ${r.trecho}`,
    `   retomar: claude --resume ${r.id}`,
  ].join("\n");
}

(async () => {
  const { termo, limite, excluir } = opcoes(process.argv.slice(2));
  if (!termo.trim()) {
    console.error('Uso: node bin/buscar.js "assunto" [--limite N] [--incluir-atual]');
    process.exit(1);
  }
  const resultados = await buscar(termo, { limite, excluir });
  console.log(resultados.length ? resultados.map(formatar).join("\n\n") : `Nenhuma conversa encontrada sobre "${termo}".`);
})();
