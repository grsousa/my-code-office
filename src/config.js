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

// As configurações do VS Code ganharam nomes em inglês na 0.9; os nomes antigos continuam valendo.
const NOMES_ANTIGOS = {
  language: "idioma", layout: "arranjo", visibleHours: "horasVisiveis", napMinutes: "minutosCochilo",
  tiredTokens: "tokensCansado", environmentsFile: "arquivoAmbientes", noticesFile: "arquivoAvisos",
};

function explicito(configVsCode, chave) {
  const inspecao = configVsCode.inspect(chave) || {};
  return inspecao.workspaceValue !== undefined ? inspecao.workspaceValue : inspecao.globalValue;
}

// valor explícito do VS Code (nome novo, depois o antigo) > valor da entrevista > padrão
function escolher(configVsCode, chave, daEntrevista, padrao) {
  for (const nome of [chave, NOMES_ANTIGOS[chave]].filter(Boolean)) {
    const valor = explicito(configVsCode, nome);
    if (valor !== undefined) return valor;
  }
  return daEntrevista !== undefined && daEntrevista !== null ? daEntrevista : padrao;
}

module.exports = { lerConfigDaEntrevista, escolher, NOMES_ANTIGOS, ARQUIVO };
