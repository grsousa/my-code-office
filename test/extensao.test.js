"use strict";
// Teste de fumaça da extensão com um módulo "vscode" falso: ativa, resolve o painel e recebe um retrato.
const test = require("node:test");
const assert = require("node:assert");
const Module = require("module");
const os = require("os");
const fs = require("fs");
const path = require("path");
// A ativação migra configuração e instala skills: roda numa casa temporária, nunca no ~/.claude de verdade.
const casa = fs.mkdtempSync(path.join(os.tmpdir(), "mco-ext-"));
process.env.HOME = casa;
process.env.USERPROFILE = casa;

function vscodeFalso(registro) {
  const uri = (caminho) => ({ fsPath: caminho, toString: () => caminho });
  return {
    Uri: { joinPath: (base, ...partes) => uri([base.fsPath, ...partes].join("/")), file: uri },
    window: {
      registerWebviewViewProvider: (id, provider) => { registro.provider = provider; registro.id = id; return { dispose() {} }; },
      showInformationMessage: () => {}, showTextDocument: async () => {},
    },
    commands: { registerCommand: () => ({ dispose() {} }), executeCommand: async () => {} },
    workspace: { getConfiguration: () => ({ get: (_chave, padrao) => padrao, inspect: () => ({}) }), onDidChangeConfiguration: () => ({ dispose() {} }) },
    env: { language: "pt-br", clipboard: { writeText: async (texto) => { registro.copiado = texto; } } },
  };
}

test("a extensão ativa, monta o painel e envia o retrato", async () => {
  const registro = {};
  const carregarOriginal = Module._load;
  Module._load = function (pedido, ...resto) { return pedido === "vscode" ? vscodeFalso(registro) : carregarOriginal.call(this, pedido, ...resto); };
  try {
    const extensao = require("../extension");
    const assinaturas = [];
    const estadoGlobal = new Map([["convidado", true]]);
    extensao.activate({ extensionUri: { fsPath: "/ext" }, subscriptions: assinaturas, extension: { packageJSON: { version: "0.0.0-teste" } }, globalState: { get: (k) => estadoGlobal.get(k), update: async (k, v) => estadoGlobal.set(k, v) } });
    assert.equal(registro.id, "myCodeOffice.cena");

    const mensagens = [];
    let aoReceber;
    const view = {
      visible: true,
      webview: { cspSource: "vscode-resource:", options: null, html: "", asWebviewUri: (u) => u,
        onDidReceiveMessage: (fn) => { aoReceber = fn; }, postMessage: async (m) => { mensagens.push(m); } },
      onDidChangeVisibility: () => {}, onDidDispose: () => {},
    };
    registro.provider.resolveWebviewView(view);
    assert.match(view.webview.html, /Content-Security-Policy/);
    assert.match(view.webview.html, /painel\.js/);
    assert.ok(mensagens.length >= 1, "deveria enviar um retrato logo ao abrir");
    assert.equal(mensagens[0].type, "retrato");
    assert.ok(Array.isArray(mensagens[0].retrato.sessoes));

    assert.match(view.webview.html, /lateral.js/);
    assert.match(view.webview.html, /id="busca"/);
    const antes = mensagens.length;
    registro.provider.atualizar();
    assert.equal(mensagens.length, antes, "retrato igual não deveria ser reenviado");
    await aoReceber({ type: "buscar", termo: "escritório" });
    const busca = mensagens.find((m) => m.type === "resultadoBusca");
    assert.ok(busca && Array.isArray(busca.resultados), "a busca deveria responder");
    await aoReceber({ type: "copiarRetomar", id: "abc-123" });
    assert.equal(registro.copiado, "claude --resume abc-123");
    await aoReceber({ type: "copiarRetomar", id: "abc; rm -rf /" });
    assert.equal(registro.copiado, "claude --resume abc-123", "id inválido não pode chegar ao clipboard");
    assinaturas.forEach((a) => a.dispose && a.dispose());
  } finally {
    Module._load = carregarOriginal;
  }
});
