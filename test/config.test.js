"use strict";
// Configurações do VS Code: nome novo em inglês, nome antigo ainda vale, depois a entrevista, depois o padrão.
const test = require("node:test");
const assert = require("node:assert");
const { escolher } = require("../src/config");

const vscode = (valores) => ({ inspect: (chave) => (chave in valores ? { globalValue: valores[chave] } : {}) });

test("nome novo vence; nome antigo ainda vale; sem nada, entrevista e padrão", () => {
  assert.equal(escolher(vscode({ language: "en", idioma: "pt-BR" }), "language", "pt-BR", "auto"), "en");
  assert.equal(escolher(vscode({ idioma: "en" }), "language", "pt-BR", "auto"), "en");
  assert.equal(escolher(vscode({}), "language", "pt-BR", "auto"), "pt-BR");
  assert.equal(escolher(vscode({}), "visibleHours", null, 12), 12);
  assert.equal(escolher(vscode({ horasVisiveis: 24 }), "visibleHours", null, 12), 24);
});
