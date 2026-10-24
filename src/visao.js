// Webview do painel do My Code Office: envia o retrato quando algo muda e atende às ações da cena.
"use strict";
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const { montarRetrato, dispensar } = require("./retrato");
const { lerConfigDaEntrevista, escolher } = require("./config");
const { buscar } = require("./busca");
const { expandir, marcarAviso, ignorarBranch, voltarBranch } = require("./quadros");
const caminhos = require("./caminhos");
const { traduzir, resolverIdioma } = require("../media/textos");

const INTERVALO_MS = 2500;
const SCRIPTS = ["textos.js", "pixel.js", "sprites.js", "ambiente.js", "cena.js", "lateral.js", "painel.js"];

class VisaoEscritorio {
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
  }

  resolveWebviewView(view) {
    this.view = view;
    const media = vscode.Uri.joinPath(this.extensionUri, "media");
    view.webview.options = { enableScripts: true, localResourceRoots: [media] };
    view.webview.html = this.html(view.webview, media);
    view.webview.onDidReceiveMessage((mensagem) => this.atender(mensagem));
    view.onDidChangeVisibility(() => this.agendar());
    vscode.workspace.onDidChangeConfiguration((e) => { if (e.affectsConfiguration("myCodeOffice")) this.atualizar(true); });
    view.onDidDispose(() => this.parar());
    this.vigiarHooks();
    this.agendar();
  }

  configuracao() {
    const c = vscode.workspace.getConfiguration("myCodeOffice"), entrevista = lerConfigDaEntrevista() || {};
    const idioma = resolverIdioma(escolher(c, "idioma", entrevista.idioma, "auto"), vscode.env.language);
    return {
      idioma,
      arranjo: escolher(c, "arranjo", entrevista.arranjo, "fileiras"),
      ambientes: entrevista.ambientes || ["dev", "tst", "hmg"], repos: entrevista.repos || [],
      tituloFila: entrevista.tituloFila || traduzir(idioma, "fila.titulo"),
      horasVisiveis: c.get("horasVisiveis", 12), minutosCochilo: c.get("minutosCochilo", 60), tokensCansado: c.get("tokensCansado", 400000),
      arquivoAmbientes: c.get("arquivoAmbientes", caminhos.ESTADO_BRANCHES), arquivoAvisos: c.get("arquivoAvisos", caminhos.AVISOS),
    };
  }

  t(chave, parametros) {
    return traduzir(this.configuracao().idioma, chave, parametros);
  }

  // Só envia quando algo mudou: o painel não repinta à toa (cliques, foco e seleção de texto ficam intactos).
  atualizar(forcar = false) {
    if (!this.view || !this.view.visible) return;
    try {
      const config = this.configuracao();
      const retrato = { ...montarRetrato(config, () => this.atualizarEmBreve()), arranjo: config.arranjo, tituloFila: config.tituloFila, idioma: config.idioma };
      const chave = JSON.stringify({ ...retrato, agora: 0 });
      if (!forcar && chave === this.ultimaChave) return;
      this.ultimaChave = chave;
      void this.view.webview.postMessage({ type: "retrato", retrato });
    } catch (erro) {
      console.error("[my-code-office] falha ao montar o retrato", erro);
    }
  }

  atualizarEmBreve() {
    clearTimeout(this.adiado);
    this.adiado = setTimeout(() => this.atualizar(), 300);
  }

  agendar() {
    this.parar();
    if (!this.view || !this.view.visible) return;
    this.atualizar();
    this.relogio = setInterval(() => this.atualizar(), INTERVALO_MS);
  }

  parar() {
    clearInterval(this.relogio);
    this.relogio = undefined;
  }

  vigiarHooks() {
    if (this.vigia) return;
    try {
      fs.mkdirSync(caminhos.SESSOES, { recursive: true });
      this.vigia = fs.watch(caminhos.SESSOES, () => this.atualizarEmBreve());
    } catch { /* sem vigia, o intervalo cobre */ }
  }

  async abrirArquivo(qual) {
    const config = this.configuracao();
    const caminho = expandir(qual === "avisos" ? config.arquivoAvisos : config.arquivoAmbientes);
    if (qual === "avisos" && !fs.existsSync(caminho)) {
      fs.mkdirSync(path.dirname(caminho), { recursive: true });
      fs.writeFileSync(caminho, this.t("ext.avisosIniciais"));
    }
    if (!fs.existsSync(caminho)) return vscode.window.showInformationMessage(this.t("ext.arquivoNaoEncontrado", { caminho }));
    await vscode.window.showTextDocument(vscode.Uri.file(caminho));
  }

  marcar({ linha, texto, feito }) {
    const gravou = Number.isInteger(linha) && typeof texto === "string" && marcarAviso(this.configuracao().arquivoAvisos, linha, texto, !!feito);
    if (!gravou) vscode.window.showWarningMessage(this.t("ext.avisosMudou"));
    this.atualizar(true);
  }

  // Ignorar uma branch no correio grava na seção "Ignoradas" do estado.md (vale também para o /branches).
  ignorar({ type, repo, branch }) {
    const valido = (v) => typeof v === "string" && v.length < 200 && /^[^`\r\n]+$/.test(v);
    if (!valido(repo) || !valido(branch)) return;
    const arquivo = this.configuracao().arquivoAmbientes, hoje = new Date().toISOString().slice(0, 10);
    try {
      if (type === "ignorarBranch") ignorarBranch(arquivo, repo, branch, this.t("correio.motivo"), hoje);
      else voltarBranch(arquivo, repo, branch);
    } catch (erro) {
      vscode.window.showWarningMessage(this.t("ext.ignorarFalhou", { erro: erro.message }));
    }
    this.atualizar(true);
  }

  async responderBusca(termo) {
    if (typeof termo !== "string" || !termo.trim()) return;
    const resultados = await buscar(termo.slice(0, 200), { limite: 15 }).catch(() => []);
    if (this.view) void this.view.webview.postMessage({ type: "resultadoBusca", termo, resultados });
  }

  async atender(mensagem) {
    if (mensagem.type === "pronto") return this.atualizar(true);
    if (mensagem.type === "buscar") return this.responderBusca(mensagem.termo);
    if (mensagem.type === "abrirArquivo") return this.abrirArquivo(mensagem.qual);
    if (mensagem.type === "marcarAviso") return this.marcar(mensagem);
    if (mensagem.type === "dispensar" && /^[\w-]+$/.test(mensagem.id || "") && Number.isFinite(mensagem.atualizado)) {
      dispensar(mensagem.id, mensagem.atualizado);
      return this.atualizar(true);
    }
    if (mensagem.type === "ignorarBranch" || mensagem.type === "voltarBranch") return this.ignorar(mensagem);
    if (mensagem.type === "copiarRetomar" && /^[\w-]+$/.test(mensagem.id || "")) {
      await vscode.env.clipboard.writeText(`claude --resume ${mensagem.id}`);
      vscode.window.showInformationMessage(this.t("ext.retomarCopiado"));
    }
  }

  dispose() {
    this.parar();
    if (this.vigia) this.vigia.close();
  }

  html(webview, media) {
    const uri = (arquivo) => webview.asWebviewUri(vscode.Uri.joinPath(media, arquivo)).toString();
    const csp = ["default-src 'none'", `style-src ${webview.cspSource}`, `script-src ${webview.cspSource}`, `img-src ${webview.cspSource}`].join("; ");
    const idioma = this.configuracao().idioma, t = (chave) => traduzir(idioma, chave).replace(/"/g, "&quot;");
    return `<!DOCTYPE html>
<html lang="${idioma}">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${uri("escritorio.css")}">
</head>
<body>
  <div class="topo">
    <div class="hud" id="hud" aria-label="${t("hud.aria")}"></div>
    <input id="busca" type="search" placeholder="${t("busca.placeholder")}" aria-label="${t("busca.aria")}" spellcheck="false">
  </div>
  <div class="alerta" id="alerta" role="alert"></div>
  <div class="corpo">
    <div class="cena">
      <div class="palco" id="palco">
        <canvas id="cv" width="288" height="208" role="img" aria-label="${t("cena.aria")}"></canvas>
        <div class="rotulos" id="rotulos"></div>
        <div class="dica" id="dica" role="tooltip"></div>
      </div>
    </div>
    <aside class="lado" id="lado" aria-label="${t("lado.aria")}"></aside>
  </div>
  ${SCRIPTS.map((s) => `<script src="${uri(s)}"></script>`).join("\n  ")}
</body>
</html>`;
  }
}

module.exports = { VisaoEscritorio };
