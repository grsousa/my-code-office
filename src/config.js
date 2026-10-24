// Configuração gerada pela entrevista (~/.claude/my-code-office/config.json).
// O que a pessoa definir explicitamente nas configurações do VS Code tem prioridade.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");

const ARQUIVO = require("./caminhos").CONFIG;

function lerConfigDaEntrevista() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO, "utf8")); } catch { return null; }
}

// valor explícito do VS Code > valor da entrevista > padrão
function escolher(configVsCode, chave, daEntrevista, padrao) {
  const inspecao = configVsCode.inspect(chave) || {};
  const explicito = inspecao.workspaceValue !== undefined ? inspecao.workspaceValue : inspecao.globalValue;
  if (explicito !== undefined) return explicito;
  return daEntrevista !== undefined && daEntrevista !== null ? daEntrevista : padrao;
}

module.exports = { lerConfigDaEntrevista, escolher, ARQUIVO };
