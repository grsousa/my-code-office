// Painel do webview: recebe o retrato da extensão, anima a cena, cuida da HUD e da busca.
// A lateral (fila, detalhe, quadros, resultados da busca) fica em lateral.js.
"use strict";
(function () {
  const E = window.Escritorio;
  const { esc, quando, linhaDoRepo, nomeDoEstado, tarefaDe } = E.util;
  const t = (chave, parametros) => E.t(chave, parametros);
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  const canvas = $("cv"), palco = $("palco"), rotulosEl = $("rotulos"), dica = $("dica"), lado = $("lado"), campoBusca = $("busca");
  E.usar(canvas.getContext("2d"));

  const salvo = vscode.getState() || {};
  const estado = { selecionado: salvo.selecionado || null, feitosAberto: !!salvo.feitosAberto, abertos: salvo.abertos || (salvo.correioAberto ? { correio: true } : {}), zoom: salvo.zoom, foco: null };
  const salvar = () => vscode.setState({ selecionado: estado.selecionado, feitosAberto: estado.feitosAberto, abertos: estado.abertos, zoom: estado.zoom });
  let retrato = null, sobMouse = null, chaveDoRetrato = null;
  let busca = { termo: "", resultados: [], ids: new Set(), carregando: false };

  const sessao = (id) => retrato && retrato.sessoes.find((s) => s.id === id);

  // ---------- escala e rótulos ----------
  // Zoom em passos de 20%, do escritório inteiro até 2x a largura cheia. "largura" (enche a largura e a cena
  // rola) é parada no caminho e o padrão; os demais níveis ficam salvos como fator sobre o inteiro.
  const PASSO = 1.2, cena = palco.parentElement;
  if (estado.zoom === "inteiro") estado.zoom = 1;
  if (!(estado.zoom === "largura" || estado.zoom >= 1)) estado.zoom = "largura";
  const moldura = document.createElement("div");
  moldura.className = "moldura";
  cena.replaceWith(moldura);
  moldura.append(cena);
  const controles = document.createElement("div");
  controles.className = "zoom";
  controles.innerHTML = '<button data-zoom="-1">−</button><button data-zoom="1">+</button><button data-zoom="0">⤢</button>';
  // Minimapa: o escritório inteiro com a janela do que está à vista; clicar ou arrastar leva até lá.
  const mapa = document.createElement("div");
  mapa.className = "minimapa";
  mapa.innerHTML = `<canvas width="${E.CW}" height="${E.CH}"></canvas><i></i>`;
  moldura.append(controles, mapa);
  const mapaTela = mapa.firstChild.getContext("2d"), janela = mapa.lastChild;
  function medidas() {
    const inteiro = Math.max(0.5, Math.min(cena.clientWidth / E.CW, cena.clientHeight / E.CH));
    const largura = Math.max(inteiro, cena.clientWidth / E.CW);
    return { inteiro, largura, maximo: Math.max(largura * 2, inteiro * 2) };
  }
  function escalaAtual() {
    const m = medidas();
    return estado.zoom === "largura" ? m.largura : Math.min(m.maximo, m.inteiro * estado.zoom);
  }
  function legendasDoZoom() {
    const titulos = { "-1": "zoom.menos", "1": "zoom.mais", "0": "zoom.inteiro" }, m = medidas(), e = escalaAtual();
    for (const b of controles.children) { b.title = t(titulos[b.dataset.zoom]); b.setAttribute("aria-label", b.title); }
    controles.children[0].disabled = controles.children[2].disabled = e <= m.inteiro * 1.001;
    controles.children[1].disabled = e >= m.maximo * 0.999;
    mapa.title = t("zoom.mapa");
  }
  function mudarZoom(passo) {
    const m = medidas(), atual = escalaAtual();
    let nova = passo === 0 ? m.inteiro : Math.min(m.maximo, Math.max(m.inteiro, passo > 0 ? atual * PASSO : atual / PASSO));
    // Passando pela largura cheia (ou chegando perto dela), para nela.
    const cruzou = (atual < m.largura * 0.99 && nova > m.largura * 1.01) || (atual > m.largura * 1.01 && nova < m.largura * 0.99);
    if (passo !== 0 && (cruzou || Math.abs(nova - m.largura) / m.largura < 0.08)) nova = m.largura;
    if (Math.abs(nova - atual) < 0.001) return;
    const deInteiro = atual <= m.inteiro * 1.001;
    // Mantém no centro o mesmo ponto; vindo do inteiro, centra nas mesas.
    const cx = (cena.scrollLeft + cena.clientWidth / 2) / cena.scrollWidth;
    const cy = deInteiro ? FOCO_Y / E.CH : (cena.scrollTop + cena.clientHeight / 2) / cena.scrollHeight;
    estado.zoom = nova === m.largura ? "largura" : nova / m.inteiro; salvar(); encaixar();
    irPara(cx, cy);
  }
  function irPara(fx, fy) {
    cena.scrollLeft = fx * cena.scrollWidth - cena.clientWidth / 2;
    cena.scrollTop = fy * cena.scrollHeight - cena.clientHeight / 2;
    marcarJanela();
  }
  function marcarJanela() {
    if (!moldura.classList.contains("ampliada")) return;
    const kx = mapa.clientWidth / cena.scrollWidth, ky = mapa.clientHeight / cena.scrollHeight;
    Object.assign(janela.style, { left: `${cena.scrollLeft * kx}px`, top: `${cena.scrollTop * ky}px`,
      width: `${Math.min(mapa.clientWidth, cena.clientWidth * kx)}px`, height: `${Math.min(mapa.clientHeight, cena.clientHeight * ky)}px` });
  }
  function irPeloMapa(e) {
    if (!(e.buttons & 1)) return;
    const r = mapa.getBoundingClientRect();
    irPara((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  }
  mapa.addEventListener("pointerdown", (e) => { mapa.setPointerCapture(e.pointerId); irPeloMapa(e); });
  mapa.addEventListener("pointermove", irPeloMapa);
  cena.addEventListener("scroll", marcarJanela, { passive: true });
  controles.addEventListener("click", (e) => { const b = e.target.closest("[data-zoom]"); if (b) mudarZoom(Number(b.dataset.zoom)); });
  cena.addEventListener("wheel", (e) => { if (!e.ctrlKey) return; e.preventDefault(); mudarZoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });
  const FOCO_Y = 140;
  let centrado = false;
  function encaixar() {
    const escala = escalaAtual();
    palco.style.width = `${Math.floor(E.CW * escala)}px`;
    const rola = palco.offsetHeight > cena.clientHeight + 1 || palco.offsetWidth > cena.clientWidth + 1;
    moldura.classList.toggle("ampliada", rola);
    if (rola && !centrado) { centrado = true; irPara(0.5, FOCO_Y / E.CH); }
    legendasDoZoom();
    marcarJanela();
    palco.classList.toggle("compacto", escala < 2.2);
    desenharRotulos(true);
  }
  // Rótulo centralizado no ponto, mas sem passar das bordas da cena.
  function manterDentro(el) {
    const largura = palco.clientWidth, meio = el.offsetWidth / 2, x = parseFloat(el.style.left);
    el.style.left = `${Math.min(Math.max(x, meio + 2), largura - meio - 2)}px`;
  }
  let assinaturaDosRotulos = "";
  function desenharRotulos(forcar) {
    if (!retrato) return;
    const k = canvas.getBoundingClientRect().width / E.CW, rotulos = E.Cena.rotulos();
    const assinatura = JSON.stringify([k, estado.selecionado, sobMouse, rotulos]);
    if (!forcar && assinatura === assinaturaDosRotulos) return;
    assinaturaDosRotulos = assinatura;
    rotulosEl.innerHTML = "";
    for (const r of rotulos) {
      const el = document.createElement("div");
      const marcado = r.id && (r.id === estado.selecionado || r.id === sobMouse);
      el.className = `tag ${r.cls}${marcado ? " on" : ""}${r.id === estado.selecionado ? " sel" : ""}`;
      el.textContent = r.texto;
      el.style.left = `${r.em[0] * k}px`; el.style.top = `${r.em[1] * k}px`;
      rotulosEl.appendChild(el);
      manterDentro(el);
    }
  }

  // ---------- dica e cliques na cena ----------
  function areaEm(evento) {
    const caixa = canvas.getBoundingClientRect();
    const x = ((evento.clientX - caixa.left) / caixa.width) * E.CW, y = ((evento.clientY - caixa.top) / caixa.height) * E.CH;
    const dentro = E.Cena.areas().filter((a) => x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1);
    return dentro.find((a) => a.tipo === "mesa") || dentro[0];
  }
  function dicaDaMesa(s) {
    const linhas = [`<h3>${esc(s.nome)}</h3>`, `<div><span class="k">${nomeDoEstado(s.estado)}</span> · ${quando(s.desde)}</div>`];
    linhas.push(s.repos.length ? s.repos.map(linhaDoRepo).join("") : `<div class="k">${t("dica.semRepo")}</div>`);
    const tarefa = tarefaDe(s);
    if (tarefa) linhas.push(`<div><span class="k">${t("dica.ultimoPedido")}</span> ${esc(tarefa.slice(0, 140))}</div>`);
    if (s.pedido) linhas.push(`<div class="warn">${t("detalhe.pede")} ${esc(s.pedido)}</div>`);
    s.repos.filter((r) => r.branchMudou).forEach((r) => linhas.push(`<div class="warn">${esc(t("dica.branchMudou", { repo: r.nome, antes: r.branchVisto }))}</div>`));
    if (busca.ids.has(s.id)) linhas.push(`<div class="k">${esc(t("busca.falou", { termo: busca.termo }))}</div>`);
    return linhas.join("");
  }
  const caixaDeDica = (titulo, texto) => `<h3>${esc(titulo)}</h3><div>${esc(texto)}</div>`;
  function dicaDoAmbiente(amb) {
    if (!amb.quem) return caixaDeDica(amb.k.toUpperCase(), t("dica.ambienteVazio"));
    const desde = amb.desde ? ` · ${t("dica.desde", { d: amb.desde })}` : "";
    return `<h3>${esc(amb.k.toUpperCase())}</h3><div>${esc(amb.quem + desde)}</div><div><code>${esc(amb.branch || "")}</code></div>`;
  }
  function textoDaDica(area) {
    if (area.tipo === "mesa") return dicaDaMesa(sessao(area.id));
    if (area.tipo === "ambiente") return dicaDoAmbiente(retrato.ambientes.find((a) => a.k === area.k));
    if (area.tipo === "reuniao") {
      const s = area.id && sessao(area.id);
      return s ? `<h3>${esc(t("dica.reuniao", { nome: s.nome }))}</h3>${s.subagentes.map((d) => `<div>· ${esc(d)}</div>`).join("")}` : caixaDeDica(t("dica.salaVazia"), t("dica.salaVazia.texto"));
    }
    if (area.tipo === "correio") return caixaDeDica(t("correio.titulo"), t("dica.correio", { n: retrato.correio.commits }));
    if (area.tipo === "quadro") {
      const pendentes = retrato.avisos.filter((a) => !a.feito).length;
      return caixaDeDica(t("avisos.titulo"), pendentes ? t("dica.quadro", { n: pendentes }) : t("dica.tudoFeito"));
    }
    if (area.tipo === "fila") return caixaDeDica(t("dica.semMesa"), t("dica.semMesa.texto", { n: area.n }));
    return caixaDeDica(t("dica.gestor"), t("dica.gestor.texto"));
  }
  function posicionarDica(evento) {
    const caixa = palco.getBoundingClientRect(), x = evento.clientX - caixa.left, y = evento.clientY - caixa.top;
    const largura = dica.offsetWidth, altura = dica.offsetHeight;
    dica.style.left = `${Math.min(Math.max(4, x + 14), caixa.width - largura - 4)}px`;
    dica.style.top = `${y + 16 + altura > caixa.height ? Math.max(4, y - altura - 12) : y + 16}px`;
  }
  canvas.addEventListener("mousemove", (evento) => {
    if (!retrato) return;
    const area = areaEm(evento);
    canvas.classList.toggle("hot", !!area);
    const novo = area && (area.tipo === "mesa" || area.tipo === "gestor") ? area.id : null;
    if (novo !== sobMouse) { sobMouse = novo; desenharRotulos(); }
    if (!area) { dica.classList.remove("on"); return; }
    dica.innerHTML = textoDaDica(area); dica.classList.add("on"); posicionarDica(evento);
  });
  canvas.addEventListener("mouseleave", () => { dica.classList.remove("on"); sobMouse = null; desenharRotulos(); });
  canvas.addEventListener("click", (evento) => {
    const area = retrato && areaEm(evento);
    if (!area) return;
    if (area.tipo === "mesa" || (area.tipo === "reuniao" && area.id)) return selecionar(area.id);
    if (area.tipo === "ambiente") vscode.postMessage({ type: "abrirArquivo", qual: "ambientes" });
    estado.foco = { ambiente: "ambiente", quadro: "quadro", correio: "correio" }[area.tipo] || null;
    if (estado.foco) { estado.abertos = { ...estado.abertos, [estado.foco]: true }; salvar(); }   // clicou na sala, no quadro ou no correio: abre a seção
    selecionar(null);
  });

  function selecionar(id) {
    const anterior = estado.selecionado;
    estado.selecionado = id; salvar();
    E.Cena.selecionar(id); E.Lateral.desenhar({ forcar: true }); desenharRotulos();
    const alvo = id ? $("voltar") : anterior && lado.querySelector(`[data-id="${CSS.escape(anterior)}"]`);
    if (alvo) alvo.focus({ preventScroll: !id });
  }

  // ---------- busca ----------
  let esperaDaBusca = null;
  function pedirBusca(termo) {
    clearTimeout(esperaDaBusca);
    const limpo = termo.trim();
    if (limpo.length < 2) return limparBusca(false);
    busca = { ...busca, termo: limpo, carregando: true };
    E.Lateral.desenhar({ forcar: true });
    esperaDaBusca = setTimeout(() => vscode.postMessage({ type: "buscar", termo: limpo }), 350);
  }
  function limparBusca(limparCampo = true) {
    if (limparCampo) campoBusca.value = "";
    busca = { termo: "", resultados: [], ids: new Set(), carregando: false };
    E.Cena.destacar(busca.ids); E.Lateral.desenhar({ forcar: true });
  }
  campoBusca.addEventListener("input", () => pedirBusca(campoBusca.value));
  campoBusca.addEventListener("keydown", (e) => { if (e.key === "Escape") limparBusca(); });
  function receberBusca({ termo, resultados }) {
    if (termo !== busca.termo) return;   // resposta de uma busca já substituída
    busca = { termo, resultados, ids: new Set(resultados.map((r) => r.id)), carregando: false };
    E.Cena.destacar(busca.ids); E.Lateral.desenhar({ forcar: true });
  }

  // ---------- HUD ----------
  const ultimoHtml = new Map();
  function pintar(el, html) { if (ultimoHtml.get(el) !== html) { ultimoHtml.set(el, html); el.innerHTML = html; } }
  function desenharHud() {
    const conta = (...estados) => retrato.sessoes.filter((s) => estados.includes(s.estado)).length;
    const itens = [["esperando", conta("esperando"), "hud.esperando"], ["cafe", conta("cafe"), "hud.cafe"], ["reuniao", conta("reuniao"), "hud.reuniao"], ["digitando", conta("digitando", "pensando"), "hud.trabalhando"], ["dormindo", conta("dormindo"), "hud.paradas"]];
    pintar($("hud"), itens.map(([k, n, rotulo]) => `<span class="pill s-${k}"><i class="dot"></i><b>${n}</b> ${t(rotulo)}</span>`).join("")
      + (retrato.comHooks ? "" : `<span class="pill aviso" title="${esc(t("hud.estimado.dica"))}">${t("hud.estimado")}</span>`));
    const nome = (id) => esc((sessao(id) || { nome: "?" }).nome);
    const pares = retrato.conflitos.map(([a, b]) => t("alerta.par", { a: nome(a), b: nome(b) })).join("; ");
    pintar($("alerta"), pares ? t("alerta.esbarrao", { pares }) : "");
    $("alerta").classList.toggle("on", !!pares);
  }

  // Textos fixos do HTML que a extensão monta antes de saber o idioma.
  function aplicarIdiomaNaPagina() {
    document.documentElement.lang = E.idioma;
    campoBusca.placeholder = t("busca.placeholder");
    campoBusca.setAttribute("aria-label", t("busca.aria"));
    $("hud").setAttribute("aria-label", t("hud.aria"));
    canvas.setAttribute("aria-label", t("cena.aria"));
    lado.setAttribute("aria-label", t("lado.aria"));
    legendasDoZoom();
  }

  // ---------- ciclo ----------
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ultimoQuadro = 0;
  function receberRetrato(novo) {
    const chave = JSON.stringify({ ...novo, agora: 0 });
    if (chave === chaveDoRetrato) return;   // nada mudou: não mexe em nada (cliques, foco e seleção ficam intactos)
    chaveDoRetrato = chave;
    retrato = novo;
    retrato.sessoes.forEach((s) => { s.repos = s.repos || []; });
    if (retrato.idioma && retrato.idioma !== E.idioma) { E.idioma = retrato.idioma; aplicarIdiomaNaPagina(); }
    if (estado.selecionado && !sessao(estado.selecionado)) { estado.selecionado = null; salvar(); }
    E.Cena.definir(retrato, estado.selecionado, retrato.arranjo);
    desenharHud(); E.Lateral.desenhar(); encaixar();
    ultimoQuadro = 0;   // redesenha a cena já, também no modo de movimento reduzido
  }
  window.addEventListener("message", (evento) => {
    if (evento.data.type === "retrato") receberRetrato(evento.data.retrato);
    if (evento.data.type === "resultadoBusca") receberBusca(evento.data);
  });
  function quadro(agora) {
    requestAnimationFrame(quadro);
    if (!retrato || (ultimoQuadro && agora - ultimoQuadro < (reduzir ? 30000 : 95))) return;
    ultimoQuadro = agora;
    E.Cena.desenhar(reduzir ? 0 : agora);
    if (moldura.classList.contains("ampliada")) mapaTela.drawImage(canvas, 0, 0);
  }

  E.Lateral.iniciar({ vscode, lado, estado, salvar, selecionar, limparBusca: () => limparBusca(), retrato: () => retrato, busca: () => busca });
  new ResizeObserver(() => encaixar()).observe(cena);
  requestAnimationFrame(quadro);
  vscode.postMessage({ type: "pronto" });
})();
