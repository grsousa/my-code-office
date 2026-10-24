// Ponto de entrada da extensão My Code Office.
"use strict";
const vscode = require("vscode");
const { VisaoEscritorio } = require("./src/visao");
const { lerConfigDaEntrevista, escolher } = require("./src/config");
const { instalarSetup, migrar, copiarFerramentas } = require("./configurador/aplicar");
const { traduzir, resolverIdioma } = require("./media/textos");

function idioma() {
  const preferido = escolher(vscode.workspace.getConfiguration("myCodeOffice"), "idioma", (lerConfigDaEntrevista() || {}).idioma, "auto");
  return resolverIdioma(preferido, vscode.env.language);
}
const t = (chave, parametros) => traduzir(idioma(), chave, parametros);

// Instala a skill da entrevista (com o caminho desta versão) e explica como começar.
async function configurar() {
  try { instalarSetup(idioma()); } catch (erro) {
    return vscode.window.showErrorMessage(t("ext.erroSkill", { erro: erro.message }));
  }
  await vscode.env.clipboard.writeText("/my-code-office");
  vscode.window.showInformationMessage(t("ext.comoComecar"));
}

// Quem usava o nome antigo (Escritório das Conversas) tem a configuração trazida sem perder nada.
function migrarDoNomeAntigo() {
  try {
    const resultado = migrar();
    if (resultado.migrou) vscode.window.showInformationMessage(`My Code Office: ${idioma() === "en" ? "your setup was moved from" : "sua configuração foi trazida de"} ${resultado.antiga}`);
  } catch (erro) {
    console.error("[my-code-office] migração do nome antigo falhou", erro);
  }
}

async function convidarNaPrimeiraVez(context) {
  const versao = context.extension.packageJSON.version;
  if (lerConfigDaEntrevista()) {
    // Versão nova: a skill da entrevista, o hook e a busca copiados para ~/.claude acompanham a extensão.
    if (context.globalState.get("versaoDaSkill") !== versao) { try { instalarSetup(idioma()); copiarFerramentas(); } catch { /* segue sem atualizar */ } }
    return context.globalState.update("versaoDaSkill", versao);
  }
  if (context.globalState.get("convidado")) return;
  await context.globalState.update("convidado", true);
  const escolha = await vscode.window.showInformationMessage(t("ext.convite"), t("ext.configurarAgora"), t("ext.depois"));
  if (escolha === t("ext.configurarAgora")) await configurar();
}

function activate(context) {
  migrarDoNomeAntigo();
  const visao = new VisaoEscritorio(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("myCodeOffice.cena", visao, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.commands.registerCommand("myCodeOffice.atualizar", () => visao.atualizar(true)),
    vscode.commands.registerCommand("myCodeOffice.abrir", () => vscode.commands.executeCommand("workbench.view.extension.myCodeOffice")),
    vscode.commands.registerCommand("myCodeOffice.configurar", configurar),
    visao,
  );
  void convidarNaPrimeiraVez(context);
}

function deactivate() {}

module.exports = { activate, deactivate };
