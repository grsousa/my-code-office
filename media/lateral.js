// Lateral do painel: fila, detalhe da conversa, busca, ambientes, avisos e correio.
// Só repinta o bloco cujo HTML mudou, e nunca no meio de um clique ou com texto selecionado.
"use strict";
(function () {
  const E = window.Escritorio;
  const t = (chave, parametros) => E.t(chave, parametros);
  const PRIORIDADE = { esperando: 0, cafe: 1, reuniao: 2, pensando: 3, digitando: 3, dormindo: 4 };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // "há 5 min" / "5 min ago": o formatador nativo cuida do idioma.
  function quando(ms) {
    const minutos = Math.round((Date.now() - ms) / 60000);
    const formato = new Intl.RelativeTimeFormat(E.idioma, { numeric: "auto", style: "short" });
    if (minutos < 1) return formato.format(0, "minute");
    if (minutos < 60) return formato.format(-minutos, "minute");
    return minutos < 48 * 60 ? formato.format(-Math.round(minutos / 60), "hour") : formato.format(-Math.round(minutos / 1440), "day");
  }
  // O texto do tempo fica fora do HTML comparado: um span preenchido à parte.
  const tempo = (ms) => `<span class="t" data-t="${Number(ms) || 0}"></span>`;
  const semMarkdown = (texto) => String(texto || "").replace(/[#*`_>]+/g, "").replace(/\s+/g, " ").trim();
  const nomeDoEstado = (estado) => t(`estado.${estado}`);
  const tarefaDe = (s) => (s.tarefaQuestionFarm ? t("tarefa.questionFarm", { pasta: s.tarefaQuestionFarm }) : s.tarefa);

  let ctx = null;   // { vscode, lado, estado: { selecionado, feitosAberto, foco }, retrato(), busca(), salvar() }
  const sessao = (id) => ctx.retrato().sessoes.find((s) => s.id === id);
  const emConflito = (id) => ctx.retrato().conflitos.some((par) => par.includes(id));
  const tituloDaFila = () => ctx.retrato().tituloFila || t("fila.titulo");

  // ---------- HTML ----------
  // Seções recolhíveis: o título abre e fecha; fechada, mostra só um resumo ao lado.
  const ABERTA_POR_PADRAO = { fila: true, ambiente: true, quadro: true, correio: false };
  const aberta = (bloco) => { const a = ctx.estado.abertos || {}; return bloco in a ? !!a[bloco] : ABERTA_POR_PADRAO[bloco]; };
  function cabecalho(bloco, titulo, direita, resumo) {
    const a = aberta(bloco);
    return `<div class="hd"><button class="recolhe" data-recolher="${bloco}" aria-expanded="${a}"><h2>${a ? "▾" : "▸"} ${titulo}</h2></button>${a ? direita : `<small>${esc(resumo)}</small>`}</div>`;
  }
  function semPush(r) {
    const p = r.pendencias;
    return p && p.commits ? t("repo.semPush", { n: p.commits }) + (p.semRemoto ? t("repo.semRemoto") : "") : "";
  }
  const linhaDoRepo = (r) => `<div><code>${esc(r.branch || "?")}</code> <span class="k">${t("repo.em")}</span> ${esc(r.nome)}<span class="k">${semPush(r)}</span></div>`;
  function motivo(s) {
    if (emConflito(s.id)) return t("motivo.conflito");
    if (s.estado === "esperando") return s.pedido || t("motivo.esperando");
    if (s.estado === "reuniao") return t("motivo.reuniao", { n: s.subagentes.length || 1, primeiro: s.subagentes[0] || "" });
    return tarefaDe(s) || s.titulo || "";
  }
  function linhaDaFila(s) {
    const marca = ctx.busca().ids.has(s.id) ? " achada" : "";
    return `<button class="row s-${s.estado}${s.id === ctx.estado.selecionado ? " sel" : ""}${marca}" data-id="${esc(s.id)}">
      <i class="dot"></i><span class="nm">${esc(s.nome)}</span><span class="when">${tempo(s.desde)}</span>
      <span class="why">${esc(motivo(s))}</span></button>`;
  }
  function htmlDaFila() {
    const lista = ctx.retrato().sessoes.slice().sort((a, b) => PRIORIDADE[a.estado] - PRIORIDADE[b.estado] || b.atualizado - a.atualizado);
    const vazio = `<p class="q">${t("fila.vazio")}</p>`;
    const topo = cabecalho("fila", esc(tituloDaFila()), `<small>${t("fila.sub")}</small>`, t("fila.resumo", { n: lista.length }));
    if (!aberta("fila")) return `<section>${topo}</section>`;
    return `<section>${topo}<div class="rows">${lista.map(linhaDaFila).join("") || vazio}</div></section>`;
  }
  function itemDaBusca(r) {
    const noEscritorio = sessao(r.id);
    const data = r.quando ? Date.parse(r.quando) : 0;
    return `<div class="achado"><div class="achado-cab"><b>${esc(r.titulo)}</b><span class="when">${tempo(data)}</span></div>
      <div class="trecho">${esc(r.trecho)}</div>
      <div class="acts">${noEscritorio ? `<button class="chip" data-id="${esc(r.id)}">${t("busca.ver")}</button>` : ""}<button class="chip" data-retomar="${esc(r.id)}">${t("retomar")}</button></div></div>`;
  }
  function htmlDaBusca() {
    const b = ctx.busca();
    const corpo = b.carregando ? `<p class="q">${t("busca.carregando")}</p>`
      : b.resultados.length ? b.resultados.map(itemDaBusca).join("") : `<p class="q">${t("busca.nada")}</p>`;
    return `<section class="busca"><div class="hd"><h2>${esc(t("busca.titulo", { termo: b.termo }))}</h2><button class="link" data-limpar-busca>${t("busca.limpar")}</button></div>${corpo}</section>`;
  }
  function htmlDosAmbientes() {
    const linhas = ctx.retrato().ambientes.map((a) => `<div class="env"><b>${esc(a.k)}</b><div>${a.quem ? `${esc(a.quem)}${a.desde ? ` · ${esc(a.desde)}` : ""}<br><code>${esc(a.branch || "")}</code>` : `<span class="q">${t("semRegistro")}</span>`}</div></div>`);
    const ocupados = ctx.retrato().ambientes.filter((a) => a.quem).map((a) => `${a.k}: ${a.quem}`).join(" · ");
    const topo = cabecalho("ambiente", t("ambientes.titulo"), `<button class="link" data-abrir="ambientes">${t("editar")}</button>`, ocupados || t("ambientes.livres"));
    return `<section>${topo}${aberta("ambiente") ? linhas.join("") : ""}</section>`;
  }
  function htmlDosAvisos() {
    const avisos = ctx.retrato().avisos;
    const nota = (a) => `<label class="note${a.feito ? " feito" : ""}"><input type="checkbox" data-linha="${Number(a.linha)}" ${a.feito ? "checked" : ""}><span>${esc(a.texto)}</span></label>`;
    const pendentes = avisos.filter((a) => !a.feito), feitos = avisos.filter((a) => a.feito);
    const lista = pendentes.map(nota).join("") || `<p class="q">${t("avisos.nada")}</p>`;
    const concluidos = feitos.length ? `<details class="feitos"${ctx.estado.feitosAberto ? " open" : ""}><summary>${t("avisos.concluidos", { n: feitos.length })}</summary><div class="notes">${feitos.map(nota).join("")}</div></details>` : "";
    const topo = cabecalho("quadro", t("avisos.titulo"), `<button class="link" data-abrir="avisos">${t("editar")}</button>`, t("avisos.resumo", { n: pendentes.length }));
    if (!aberta("quadro")) return `<section>${topo}</section>`;
    return `<section>${topo}<div class="notes">${lista}</div>${concluidos}</section>`;
  }
  // Uma linha por repo com commit sem push (o total vai na caixinha da cena). Abrindo, as branches
  // e o botão de ignorar; as ignoradas ficam no fim, com o caminho de volta.
  const botao = (acao, repo, branch, texto, dica = "") => `<button class="link" data-${acao}="${esc(repo)}" data-branch="${esc(branch)}"${dica ? ` title="${esc(dica)}"` : ""}>${texto}</button>`;
  function cartaDoRepo(r) {
    const aberta = (ctx.estado.cartasAbertas || []).includes(r.nome);
    const branches = (r.branches || []).filter((b) => !b.ignorada).map((b) => `<li><code>${esc(b.nome)}</code><span class="k">${t("correio.commits", { n: b.commits })}</span>${botao("ignorar", r.nome, b.nome, t("correio.ignorar"), t("correio.ignorarDica"))}</li>`).join("");
    return `<details class="carta" data-carta="${esc(r.nome)}"${aberta ? " open" : ""}><summary><b>${t("correio.commits", { n: Number(r.commits) })}</b> ${esc(r.nome)}${r.semRemoto ? ` <span class="warnc">${t("correio.semRemoto")}</span>` : ""}</summary>
      <ul>${branches}<li class="todo">${botao("ignorar", r.nome, "*", t("correio.ignorarRepo"), t("correio.ignorarDica"))}</li></ul></details>`;
  }
  function htmlDoCorreio() {
    const correio = ctx.retrato().correio, ignoradas = correio.ignoradas || [];
    const topo = cabecalho("correio", t("correio.titulo"), `<small>${t("correio.sub")}</small>`, t("correio.commits", { n: Number(correio.commits) }));
    if (!aberta("correio")) return `<section>${topo}</section>`;
    const repos = correio.repos.map(cartaDoRepo).join("");
    const lista = ignoradas.map((i) => `<li><span>${esc(i.repo)} · <code>${esc(i.branch === "*" ? t("correio.repoInteiro") : i.branch)}</code></span>${botao("voltar", i.repo, i.branch, t("correio.voltar"))}</li>`).join("");
    const fimDaLista = ignoradas.length ? `<details class="feitos ignoradas"${ctx.estado.ignoradasAberto ? " open" : ""}><summary>${t("correio.ignoradas", { n: ignoradas.length })}</summary><ul>${lista}</ul></details>` : "";
    return `<section>${topo}${repos || `<p class="q">${t("correio.nada")}</p>`}${fimDaLista}</section>`;
  }
  function alertasDaConversa(s) {
    const alertas = [];
    if (emConflito(s.id)) alertas.push(t("alerta.conflito"));
    else s.repos.filter((r) => r.branchMudou).forEach((r) => alertas.push(t("alerta.branchMudou", { repo: r.nome, antes: r.branchVisto, agora: r.branch })));
    s.repos.filter((r) => r.pendencias && r.pendencias.semRemoto).forEach((r) => alertas.push(t("alerta.semRemoto", { repo: r.nome })));
    if (s.tokens >= ctx.retrato().tokensCansado) alertas.push(t("alerta.contexto"));
    return alertas;
  }
  function htmlDoDetalhe(s) {
    const reposHtml = s.repos.length ? s.repos.map(linhaDoRepo).join("") : esc(t("detalhe.nenhumRepo"));
    const campos = [
      [t("campo.titulo"), esc(s.titulo)], [t(s.repos.length > 1 ? "campo.repos" : "campo.repo"), reposHtml], [t("campo.pasta"), esc(s.cwd)],
      [t("campo.origem"), s.via && esc(t("detalhe.via", { via: s.via }))], [t("campo.contexto"), s.tokens ? esc(t("detalhe.tokens", { n: Math.round(s.tokens / 1000) })) : null],
      [t("campo.fonte"), esc(t(s.fonte === "hooks" ? "fonte.hooks" : "fonte.transcript"))],
    ];
    const linhas = campos.filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("");
    const reuniao = s.estado === "reuniao" && s.subagentes.length ? `<div class="quote"><b>${t("detalhe.naSala")}</b>${s.subagentes.map((d) => "· " + esc(d)).join("<br>")}</div>` : "";
    const tarefa = tarefaDe(s);
    return `<div class="detail"><button class="link" id="voltar">← ${esc(tituloDaFila())}</button><h2>${esc(s.nome)}</h2>
      <span class="state s-${s.estado}"><i class="dot"></i>${nomeDoEstado(s.estado)} · ${tempo(s.desde)}</span>
      ${s.pedido ? `<div class="warnbox"><b>${t("detalhe.pede")}</b> ${esc(s.pedido)}</div>` : ""}
      <dl class="kv">${linhas}</dl>${reuniao}
      ${tarefa ? `<div class="quote me"><b>${t("detalhe.voce")}</b>${esc(tarefa)}</div>` : ""}
      ${s.ultimaResposta ? `<div class="quote"><b>Claude</b>${esc(semMarkdown(s.ultimaResposta))}</div>` : ""}
      ${alertasDaConversa(s).map((a) => `<div class="warnbox">${esc(a)}</div>`).join("")}
      ${s.via ? `<div class="quote"><b>${t("detalhe.viaDica.titulo")}</b>${esc(t("detalhe.viaDica", { via: s.via }))}</div>` : ""}
      <div class="acts"><button class="chip" data-retomar="${esc(s.id)}">${t("retomar")}</button><button class="chip" data-dispensar="${esc(s.id)}" title="${esc(t("dispensar.dica"))}">${t("dispensar")}</button></div></div>`;
  }
  const BLOCOS = { busca: htmlDaBusca, fila: htmlDaFila, ambiente: htmlDosAmbientes, quadro: htmlDosAvisos, correio: htmlDoCorreio };

  // ---------- pintura sem perder estado ----------
  const ultimoHtml = new Map();
  let forma = null, apertado = false, pendente = false;
  function pintar(el, html) {
    if (ultimoHtml.get(el) === html) return;
    ultimoHtml.set(el, html); el.innerHTML = html;
  }
  function atualizarTempos(raiz = document) {
    raiz.querySelectorAll("[data-t]").forEach((el) => {
      const texto = Number(el.dataset.t) ? quando(Number(el.dataset.t)) : "";
      if (el.textContent !== texto) el.textContent = texto;
    });
  }
  function ordemDosBlocos() {
    const ordem = ["fila", "ambiente", "quadro", "correio"], foco = ctx.estado.foco;
    if (foco && ordem.includes(foco)) ordem.unshift(...ordem.splice(ordem.indexOf(foco), 1));
    return ctx.busca().termo ? ["busca", ...ordem] : ordem;
  }
  function chaveDoFoco(el) {
    if (!el || !ctx.lado.contains(el)) return null;
    if (el.id) return `#${el.id}`;
    for (const atributo of ["id", "linha", "abrir", "retomar", "recolher"]) if (el.dataset[atributo] != null) return `[data-${atributo}="${CSS.escape(el.dataset[atributo])}"]`;
    return el.matches("details.feitos > summary") ? "details.feitos > summary" : null;
  }
  const temSelecao = () => { const s = getSelection(); return s && !s.isCollapsed && ctx.lado.contains(s.anchorNode); };
  const interagindo = () => apertado || temSelecao();

  function desenhar({ forcar = false } = {}) {
    if (!ctx.retrato()) return;
    if (!forcar && interagindo()) { pendente = true; return; }
    pendente = false;
    const lado = ctx.lado, s = ctx.estado.selecionado && sessao(ctx.estado.selecionado);
    const blocos = s ? ["detalhe"] : ordemDosBlocos();
    const novaForma = (s ? `detalhe:${s.id}` : "geral:") + blocos.join(",");
    const foco = chaveDoFoco(document.activeElement), rolagem = lado.scrollTop, mesmaForma = novaForma === forma;
    if (!mesmaForma) {
      forma = novaForma; ultimoHtml.clear();
      lado.innerHTML = blocos.map((b) => `<div data-bloco="${b}"></div>`).join("");
    }
    for (const b of blocos) pintar(lado.querySelector(`[data-bloco="${b}"]`), b === "detalhe" ? htmlDoDetalhe(s) : BLOCOS[b]());
    atualizarTempos(lado);
    lado.scrollTop = mesmaForma ? rolagem : 0;
    if (foco && !lado.contains(document.activeElement)) { const alvo = lado.querySelector(foco); if (alvo) alvo.focus({ preventScroll: true }); }
  }

  function aoClicar(e) {
    const t = e.target, v = ctx.vscode;
    const linha = t.closest("[data-id]"); if (linha) return ctx.selecionar(linha.dataset.id);
    const abrir = t.closest("[data-abrir]"); if (abrir) return v.postMessage({ type: "abrirArquivo", qual: abrir.dataset.abrir });
    const retomar = t.closest("[data-retomar]"); if (retomar) return v.postMessage({ type: "copiarRetomar", id: retomar.dataset.retomar });
    const tirar = t.closest("[data-dispensar]");
    if (tirar) { const s = sessao(tirar.dataset.dispensar); ctx.selecionar(null); return s && v.postMessage({ type: "dispensar", id: s.id, atualizado: s.atualizado }); }
    const recolher = t.closest("[data-recolher]");
    if (recolher) {
      const bloco = recolher.dataset.recolher;
      ctx.estado.abertos = { ...(ctx.estado.abertos || {}), [bloco]: !aberta(bloco) };
      ctx.salvar();
      return desenhar({ forcar: true });
    }
    const ignorar = t.closest("[data-ignorar]");
    if (ignorar) return v.postMessage({ type: "ignorarBranch", repo: ignorar.dataset.ignorar, branch: ignorar.dataset.branch });
    const voltar = t.closest("[data-voltar]");
    if (voltar) return v.postMessage({ type: "voltarBranch", repo: voltar.dataset.voltar, branch: voltar.dataset.branch });
    if (t.closest("[data-limpar-busca]")) return ctx.limparBusca();
    if (t.closest("#voltar")) ctx.selecionar(null);
  }
  function aoMudar(e) {
    const caixa = e.target.closest("input[data-linha]");
    if (!caixa) return;
    const aviso = ctx.retrato().avisos.find((a) => a.linha === Number(caixa.dataset.linha));
    if (!aviso) return;
    ultimoHtml.delete(ctx.lado.querySelector('[data-bloco="quadro"]'));   // se a gravação falhar, o próximo retrato corrige a caixa
    ctx.vscode.postMessage({ type: "marcarAviso", linha: aviso.linha, texto: aviso.texto, feito: caixa.checked });
  }

  function iniciar(contexto) {
    ctx = contexto;
    const lado = ctx.lado;
    lado.addEventListener("click", aoClicar);
    lado.addEventListener("change", aoMudar);
    lado.addEventListener("toggle", (e) => {
      const alvo = e.target, correio = ctx.lado.querySelector('[data-bloco="correio"]');
      if (alvo.matches("details.ignoradas")) { ctx.estado.ignoradasAberto = alvo.open; ultimoHtml.delete(correio); return; }
      if (alvo.matches("details.feitos")) { ctx.estado.feitosAberto = alvo.open; ctx.salvar(); }
      if (alvo.matches("details.carta")) {
        const abertas = new Set(ctx.estado.cartasAbertas || []);
        if (alvo.open) abertas.add(alvo.dataset.carta); else abertas.delete(alvo.dataset.carta);
        ctx.estado.cartasAbertas = [...abertas];
        ultimoHtml.delete(correio);
      }
    }, true);
    lado.addEventListener("pointerdown", () => { apertado = true; });
    window.addEventListener("pointerup", () => setTimeout(() => { apertado = false; if (pendente) desenhar(); }));
    document.addEventListener("selectionchange", () => { if (pendente && !temSelecao()) desenhar(); });
    setInterval(() => atualizarTempos(lado), 30000);
  }

  E.Lateral = { iniciar, desenhar, esquecer: () => { forma = null; } };
  E.util = { esc, quando, semMarkdown, linhaDoRepo, nomeDoEstado, tarefaDe };
})();
