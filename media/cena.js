// Cena isométrica: monta móveis e mesas a partir do retrato, ordena por profundidade e desenha.
"use strict";
(function () {
  const E = window.Escritorio;
  const { CW, CH, W, D, H, P, rect, px, line, quad, wallY, wallX, drawBox, glassBox, COR, shade } = E;

  // Arranjos de mesas. "ordem" é a sequência em que as mesas são ocupadas; "ilhas" agrupa as mesas por repo.
  const ARRANJOS = {
    fileiras: {
      mesas: [[6, 5.2], [9, 5.2], [12, 5.2], [15, 5.2], [7, 9.6], [10, 9.6], [13, 9.6], [16, 9.6]].map(([x, y]) => ({ x, y })),
      ordem: [1, 5, 2, 6, 0, 4, 3, 7],
      fileiras: [[0, 1, 2, 3], [4, 5, 6, 7]],
      tapetes: [],
      pendentes: [[8.5, 6.0], [14.0, 6.0], [12.0, 10.4]],
    },
    ilhas: {
      mesas: [
        { x: 6.5, y: 4.4 }, { x: 8.5, y: 4.4 }, { x: 6.5, y: 6.3 }, { x: 8.5, y: 6.3 },
        { x: 12, y: 7.9 }, { x: 14, y: 7.9 }, { x: 12, y: 9.8 }, { x: 14, y: 9.8 },
      ],
      grupos: [[0, 1, 2, 3], [4, 5, 6, 7]],
      tapetes: [[6.0, 3.3, 11.0, 7.7, "#2f5f66", "#4d8a8f"], [11.5, 6.8, 16.5, 11.2, "#8c6a2f", "#b48a42"]],
      pendentes: [[8.5, 5.5], [14, 9.0], [11.5, 2.6]],
      etiquetas: [[6.1, 8.0], [11.6, 11.5]],
    },
  };
  const CORES_DE_TAPETE = [["#2f5f66", "#4d8a8f"], ["#8c6a2f", "#b48a42"], ["#5a3f6e", "#7d5f94"], ["#4f6a3a", "#6f8f52"], ["#7a3f33", "#a35a48"], ["#3d4f6e", "#5a6f94"]];
  let SALAS_X = [13, 15, 17];
  const salasPara = (n) => Array.from({ length: Math.min(n, 4) }, (_, i) => 19 - 2 * Math.min(n, 4) + 2 * i);
  // Na sala de reunião, a conversa que convocou fica na cabeceira; os subagentes, nas laterais.
  const CABECEIRA = [0.8, 11.15];
  const LATERAIS = [[1.8, 10.05], [3.0, 10.05], [4.0, 11.15]];
  let arranjo = ARRANJOS.fileiras, nomeDoArranjo = "fileiras", repoDaIlha = [], tapetesDoRepo = [];
  const KIND_BALAO = { esperando: ["!", "#ffd447"], cafe: ["v", "#86cf86"], pensando: ["...", "#dbeeff"], dormindo: ["z", "#cbbfd6"], reuniao: ["...", "#d9c8f5"] };

  let fundo, objetos = [], ordem = [], areas = [], rotulos = [], baloes = [];
  let retrato = { sessoes: [], ambientes: [], conflitos: [], correio: { commits: 0, repos: [] } };
  let selecionado = null, noite = false, cabecas = new Map(), destacadas = new Set(), naSala = null;

  const add = (o) => (objetos.push(o), o);
  const emConflito = (id) => retrato.conflitos.some((par) => par.includes(id));
  const cansado = (s) => s.tokens >= (retrato.tokensCansado || 400000);

  // ---------- mesas ----------
  const TAMPA = { t: "#4a4552", l: "#3b3644", r: "#2b2731", e: "#121016" };
  function notebook(s, x, y, t, vazia) {
    drawBox({ x: x + 0.7, y: y + 0.3, z: 11, w: 0.9, d: 0.5, h: 1, c: COR.DARK });
    drawBox({ x: x + 0.75, y: y + 0.3, z: 12, w: 0.8, d: 0.08, h: 5, c: TAMPA });
    const [lx, ly] = P(x + 1.15, y + 0.38, 14.5);
    const st = s ? s.estado : "dormindo", cor = COR.ESTADO[st] || COR.ESTADO.dormindo;
    rect(lx - 1, ly - 1, 2, 2, st === "esperando" && Math.floor(t / 400) % 2 ? "#7a6620" : cor);
    if (s && s.id === naSala) { rect(lx - 3, ly - 4, 4, 3, "#f4dc7a"); px(lx - 2, ly - 3, "#8a6d20"); }   // post-it: "na reunião"
  }
  function trabalhador(s, m, t) {
    const [hx, hy] = P(m.x + 1, m.y + 0.1, 11);
    const sx = Math.round(hx - 6), sy = Math.round(hy - 15);
    if (destacadas.has(s.id)) { const brilho = 0.75 + 0.25 * Math.sin(t / 300); anelNoChao(m.x, m.y, "#7fd4ff", brilho, 9); anelNoChao(m.x, m.y, "#bfeaff", brilho, 11); }
    else if (s.estado === "esperando" && Math.floor(t / 500) % 2) anelNoChao(m.x, m.y, "#ffd447", 0.5);
    E.pessoa(sx, sy, E.aparencia(s.id), s.estado, t, { cansado: cansado(s) });
    if (cansado(s) && s.estado !== "dormindo") px(sx + 11, sy + 1 + (Math.floor(t / 400) % 3), "#9fd6ff");
    if (emConflito(s.id)) baloes.push([hx, sy, "!", "#f07160"]);
    else if (KIND_BALAO[s.estado]) baloes.push([hx, sy + (s.estado === "dormindo" ? 3 : 0), ...KIND_BALAO[s.estado]]);
    if (selecionado === s.id) { const k = Math.floor(t / 250) % 2; rect(sx - 2, sy - 3 + k, 1, 3, "#f2b35b"); rect(sx + 13, sy - 3 + k, 1, 3, "#f2b35b"); }
    cabecas.set(s.id, [hx, sy]);
  }
  function anelNoChao(x, y, c, alfa, raio = 8) {
    const [fx, fy] = P(x + 1, y - 0.35, 0), g = E.contexto(), meio = raio / 2;
    g.globalAlpha = alfa;
    line([fx - raio, fy], [fx, fy - meio], c); line([fx, fy - meio], [fx + raio, fy], c); line([fx + raio, fy], [fx, fy + meio], c); line([fx, fy + meio], [fx - raio, fy], c);
    g.globalAlpha = 1;
  }
  function papeis(s, x, y) {
    const n = s.mostrarPapeis ? Math.min((s.pendencias && s.pendencias.commits) || 0, 6) : 0;
    for (let i = 0; i < n; i++) {
      const par = i % 2;
      drawBox({ x: x + 0.12 + par * 0.03, y: y + 0.5, z: 11 + i, w: 0.45, d: 0.35, h: 1, c: { t: par ? "#f6eedd" : "#ebe0c8", l: par ? "#a99a80" : "#d6c9ad", r: par ? "#8f8168" : "#bfb196" } });
    }
  }
  // Cadeira atrás, pessoa, tampa do notebook na frente. Mesa sem conversa fica arrumada e vazia.
  function mesa(s, m) {
    const { x, y } = m, ausente = !s || s.id === naSala;
    add({ x: x + 0.2, y: y - 0.8, z: 0, w: 0.6, d: 0.35, h: 19, draw() { drawBox({ ...this, c: COR.CHAIR }); } });
    add({ x, y, z: 0, w: 2, d: 1, h: 11, draw() { drawBox({ ...this, c: COR.WOOD }); } });
    if (!ausente) add({ x: x + 0.55, y: y - 0.2, z: 11, w: 0.9, d: 0.4, h: 14, draw(t) { trabalhador(s, m, t); } });
    add({ x: x + 0.75, y: y + 0.3, z: 11, w: 0.8, d: 0.08, h: 5, draw(t) { notebook(s, x, y, t, ausente); } });
    add({ x: x + 1.6, y: y + 0.55, z: 11, w: 0.22, d: 0.22, h: 3, draw(t) { drawBox({ ...this, c: COR.MUG }); if (s && s.estado === "dormindo") E.vapor(x + 1.7, y + 0.66, 15, t); } });
    if (!s) return;
    add({ x: x + 0.12, y: y + 0.5, z: 11, w: 0.45, d: 0.35, h: 6, draw() { papeis(s, x, y); } });
    const a = P(x, y + 1), b = P(x + 2, y), f = P(x + 2, y + 1);
    areas.push({ tipo: "mesa", id: s.id, x0: a[0] - 1, x1: b[0] + 1, y0: P(x + 1, y + 0.1, 11)[1] - 26, y1: f[1] });
    rotulos.push({ cls: "desk", id: s.id, texto: s.nome, em: P(x + 1.2, y + 1.2) });
    if (s.repos && s.repos.length > 1) rotulos.push({ cls: "badge", texto: E.t("cena.maisRepos", { n: s.repos.length - 1 }), em: P(x + 2.1, y + 0.1, 14) });
  }
  // ---------- quem senta onde ----------
  const semRepo = () => E.t("cena.semEdicao");
  const lugares = new Map();   // id da conversa -> índice da mesa (fica fixo enquanto a conversa existir)
  function vizinhaDoMesmoRepo(s, ocupadas, repoDaMesa) {
    if (!s.repoNome) return undefined;
    const fileiraDe = (i) => arranjo.fileiras.findIndex((f) => f.includes(i));
    return arranjo.ordem.find((i) => !ocupadas.has(i) && [i - 1, i + 1].some((j) => fileiraDe(j) === fileiraDe(i) && repoDaMesa.get(j) === s.repoNome));
  }
  function sentarEmFileiras(sessoes) {
    const ocupadas = new Set(lugares.values());
    const repoDaMesa = new Map(sessoes.filter((s) => lugares.has(s.id)).map((s) => [lugares.get(s.id), s.repoNome]));
    for (const s of sessoes) {
      if (lugares.has(s.id)) continue;
      const vizinha = vizinhaDoMesmoRepo(s, ocupadas, repoDaMesa);
      const livre = vizinha !== undefined ? vizinha : arranjo.ordem.find((i) => !ocupadas.has(i));
      if (livre !== undefined) repoDaMesa.set(livre, s.repoNome);
      if (livre === undefined) break;
      lugares.set(s.id, livre); ocupadas.add(livre);
    }
  }
  function sentarEmIlhas(sessoes) {
    const porRepo = new Map();
    for (const s of sessoes) porRepo.set(s.repoNome || semRepo(), [...(porRepo.get(s.repoNome || semRepo()) || []), s]);
    const repos = [...porRepo.keys()].sort((a, b) => porRepo.get(b).length - porRepo.get(a).length || a.localeCompare(b));
    repoDaIlha = repoDaIlha.filter((r) => porRepo.has(r));
    for (const r of repos) if (repoDaIlha.length < arranjo.grupos.length && !repoDaIlha.includes(r)) repoDaIlha.push(r);
    const ocupadas = new Set(lugares.values());
    const ocupar = (s, cadeiras) => { const livre = cadeiras.find((i) => !ocupadas.has(i)); if (livre !== undefined) { lugares.set(s.id, livre); ocupadas.add(livre); } return livre !== undefined; };
    for (const r of repos) {
      const ilha = repoDaIlha.indexOf(r), cadeiras = ilha >= 0 ? arranjo.grupos[ilha] : [];
      for (const s of porRepo.get(r)) if (!lugares.has(s.id) && !ocupar(s, cadeiras)) ocupar(s, arranjo.grupos.flat());
    }
  }
  function distribuir(sessoes) {
    const presentes = new Set(sessoes.map((s) => s.id));
    for (const id of [...lugares.keys()]) if (!presentes.has(id)) lugares.delete(id);
    (nomeDoArranjo === "ilhas" ? sentarEmIlhas : sentarEmFileiras)(sessoes);
    return sessoes.map((s) => ({ ...s, slot: lugares.has(s.id) ? lugares.get(s.id) : null }));
  }
  function trocarArranjo(nome) {
    if (nome === nomeDoArranjo || !ARRANJOS[nome]) return;
    nomeDoArranjo = nome; arranjo = ARRANJOS[nome]; lugares.clear(); repoDaIlha = [];
  }

  // ---------- áreas fixas ----------
  function gestor() {
    add({ x: 0, y: 0.45, z: 0, w: 0.5, d: 1.9, h: 36, draw() { E.estante(this); } });
    add({ x: 2.85, y: 0.5, z: 0, w: 0.6, d: 0.35, h: 16, draw() { drawBox({ ...this, c: COR.CHAIR }); } });
    add({ x: 1.9, y: 1.25, z: 0, w: 2.6, d: 1.1, h: 11, draw() { drawBox({ ...this, c: COR.WALNUT }); } });
    add({ x: 2.6, y: 1.0, z: 11, w: 0.9, d: 0.3, h: 14, draw(t) {
      const [hx, hy] = P(3.15, 1.2, 11);
      E.pessoa(Math.round(hx - 6), Math.round(hy - 12), { hair: "#d9883b", skin: "#f0c4a0", shirt: "#2f5e66", style: "curto" }, "pensando", t, { fone: true });
    } });
    add({ x: 3.0, y: 1.45, z: 11, w: 0.9, d: 0.6, h: 1, draw() { drawBox({ ...this, c: { t: "#efe3c9", l: "#d6c8a9", r: "#bfb08f" } }); } });
    add({ x: 2.05, y: 1.4, z: 11, w: 0.3, d: 0.3, h: 11, draw() { E.abajur(this); } });
    const a = P(1.9, 2.35), b = P(4.5, 1.25), f = P(4.5, 2.35);
    areas.push({ tipo: "gestor", id: "gestor", x0: a[0], x1: b[0], y0: P(3.15, 1.2, 11)[1] - 24, y1: f[1] });
    rotulos.push({ cls: "desk", id: "gestor", texto: E.t("cena.gestor"), em: P(3.6, 2.9) });
  }
  function copa() {
    add({ x: 7.6, y: 0.12, z: 0, w: 1.7, d: 0.7, h: 12, draw() { drawBox({ ...this, c: COR.WOOD }); } });
    add({ x: 7.85, y: 0.2, z: 12, w: 0.6, d: 0.45, h: 11, draw(t) {
      drawBox({ ...this, c: { t: "#a54a40", l: "#8b3a33", r: "#6e2b26", e: "#2a1010" } });
      const [lx, ly] = P(8.15, 0.65, 19); px(lx, ly, Math.floor(t / 600) % 2 ? "#ff6b5a" : "#7a2a22");
    } });
    add({ x: 8.7, y: 0.35, z: 12, w: 0.22, d: 0.22, h: 3, draw(t) { drawBox({ ...this, c: COR.MUG }); E.vapor(8.8, 0.45, 16, t); } });
  }
  function salaDeTeste(amb, i) {
    const x0 = SALAS_X[i], ocupada = !!amb.quem;
    add({ x: x0 + 1.25, y: 0.25, z: 0, w: 0.55, d: 0.5, h: 26, draw(t) { E.rack(this, t, ocupada); } });
    add({ x: x0 - 0.06, y: 0, z: 0, w: 0.12, d: 3.2, h: 30, draw() { drawBox({ ...this, c: COR.PAREDE_SALA }); } });
    add({ x: x0, y: 3.05, z: 0, w: 0.65, d: 0.15, h: 12, draw() { drawBox({ ...this, c: COR.PAREDE_SALA }); } });
    add({ x: x0 + 1.35, y: 3.05, z: 0, w: 0.65, d: 0.15, h: 12, draw() { drawBox({ ...this, c: COR.PAREDE_SALA }); } });
    add({ x: x0, y: 3.05, z: 12, w: 2, d: 0.15, h: 18, draw() { glassBox(this); } });
    const a = P(x0, 3.2), b = P(x0 + 2, 0), f = P(x0 + 2, 3.2);
    areas.push({ tipo: "ambiente", k: amb.k, x0: a[0], x1: b[0], y0: P(x0, 0, 30)[1], y1: f[1] });
    rotulos.push({ cls: "room" + (ocupada ? " busy" : ""), texto: `${amb.k.toUpperCase()} · ${amb.quem || E.t("cena.livre")}`, em: P(x0 + 1.15, 3.2, 38) });
  }
  function estrela(x, y) {
    const ouro = "#ffcf4a", brilho = "#fff3b0";
    [[0, -2], [-2, 0], [2, 0], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => px(x + dx, y + dy, ouro));
    px(x, y, brilho);
  }
  function participante(reuniao, [sx, sy], i) {
    const principal = i === 0, base = E.aparencia(reuniao.id);
    const look = principal ? base : { ...base, shirt: shade(base.shirt, 1.25) };
    add({ x: sx - 0.05, y: sy, z: 9, w: 0.6, d: 0.4, h: 14, draw(t) {
      const [hx, hy] = P(sx + 0.28, sy + 0.55, 9), g = E.contexto();
      g.globalAlpha = principal ? 1 : 0.82;
      E.pessoa(Math.round(hx - 6), Math.round(hy - 12), look, principal ? "pensando" : "digitando", t + i * 97, { cansado: principal && cansado(reuniao) });
      g.globalAlpha = 1;
      if (principal) estrela(Math.round(hx), Math.round(hy - 16 + (Math.floor(t / 400) % 2)));
      else { px(Math.round(hx), Math.round(hy - 14), "#b9a0ea"); px(Math.round(hx), Math.round(hy - 13), "#6e5a9a"); }
    } });
  }
  function salaDeReuniao() {
    const reuniao = retrato.sessoes.find((s) => s.id === naSala);
    add({ x: 0, y: 8.9, z: 0, w: 5.2, d: 0.12, h: 26, draw() { glassBox(this); } });
    add({ x: 1.5, y: 10.7, z: 0, w: 2.1, d: 1.4, h: 9, draw() { drawBox({ ...this, c: COR.WALNUT }); } });
    const subagentes = reuniao ? Math.max(reuniao.subagentes.length, 1) : 0;
    [CABECEIRA, ...LATERAIS].forEach(([sx, sy], i) => {
      add({ x: sx, y: sy - 0.35, z: 0, w: 0.55, d: 0.3, h: 14, draw() { drawBox({ ...this, c: COR.CHAIR }); } });
      if (reuniao && i <= Math.min(subagentes, LATERAIS.length)) participante(reuniao, [sx, sy], i);
    });
    if (reuniao) rotulos.push({ cls: "host", id: reuniao.id, texto: reuniao.nome.length > 26 ? `${reuniao.nome.slice(0, 25)}…` : reuniao.nome, em: P(CABECEIRA[0] + 0.28, CABECEIRA[1] + 0.55, 34) });
    add({ x: 5.15, y: 9, z: 0, w: 0.12, d: 5, h: 26, draw() { glassBox(this); } });
    const a = P(0, 14), b = P(5.2, 9), f = P(5.2, 14);
    areas.push({ tipo: "reuniao", id: reuniao && reuniao.id, x0: a[0], x1: b[0], y0: P(0, 9, 40)[1], y1: f[1] });
    rotulos.push({ cls: "room" + (reuniao ? " busy" : ""), texto: reuniao ? E.t("cena.reuniaoN", { n: subagentes }) : E.t("cena.reuniao"), em: P(3.4, 14.3) });
  }
  function cantos() {
    add({ x: 0.25, y: 7.6, z: 0, w: 0.5, d: 0.5, h: 7, draw(t) { E.planta(this, t); } });
    add({ x: 19.3, y: 4.0, z: 0, w: 0.5, d: 0.5, h: 7, draw(t) { E.planta(this, t); } });
    const cheio = retrato.correio.commits > 0;
    add({ x: 19.0, y: 12.6, z: 0, w: 0.7, d: 0.6, h: 14, cheio, draw(t) { E.correio(this, t); } });
    const a = P(19, 13.2), b = P(19.7, 12.6), f = P(19.7, 13.2);
    areas.push({ tipo: "correio", x0: a[0] - 2, x1: b[0] + 2, y0: P(19.35, 12.9, 24)[1], y1: f[1] + 1 });
    rotulos.push({ cls: "room" + (cheio ? " busy" : ""), texto: E.t("cena.correio", { n: retrato.correio.commits }), em: P(19.6, 13.5) });
    const q0 = P(0, 5.8, 18), q1 = P(0, 2.8, 40);
    areas.push({ tipo: "quadro", x0: q0[0], x1: q1[0], y0: q1[1], y1: q0[1] });
    rotulos.push({ cls: "room", texto: E.t("cena.quadro"), em: P(0.2, 4.3, 14) });
  }

  function corDoRepo(nome) {
    let h = 0;
    for (const ch of nome) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return CORES_DE_TAPETE[h % CORES_DE_TAPETE.length];
  }
  function trechosDoMesmoRepo(fileira) {
    const repoDe = (i) => { const s = retrato.sessoes.find((x) => x.slot === i); return s && s.repoNome; };
    const trechos = [];
    for (const i of fileira) {
      const ultimo = trechos[trechos.length - 1], repo = repoDe(i);
      if (!repo) continue;
      if (ultimo && ultimo.repo === repo && ultimo.mesas[ultimo.mesas.length - 1] === i - 1) ultimo.mesas.push(i);
      else trechos.push({ repo, mesas: [i] });
    }
    return trechos;
  }
  function tapetesPorRepo() {
    if (!arranjo.fileiras) return [];
    return arranjo.fileiras.flatMap(trechosDoMesmoRepo).map(({ repo, mesas }) => {
      const primeira = arranjo.mesas[mesas[0]], ultima = arranjo.mesas[mesas[mesas.length - 1]];
      const [x0, y0, x1, y1] = [primeira.x - 0.4, primeira.y - 1.15, ultima.x + 2.4, primeira.y + 1.45];
      rotulos.push({ cls: "zone", texto: repo, em: P((x0 + x1) / 2, y1 + 0.05) });   // centro da borda da frente
      return [x0, y0, x1, y1, ...corDoRepo(repo)];
    });
  }

  function escolherReuniao() {
    const emReuniao = retrato.sessoes.filter((s) => s.estado === "reuniao")
      .sort((a, b) => b.subagentes.length - a.subagentes.length || b.atualizado - a.atualizado);
    return emReuniao.length ? emReuniao[0].id : null;
  }
  // Mais de 8 conversas: placa na entrada, para não sumirem sem aviso.
  function semMesa() {
    const n = retrato.sessoes.filter((s) => s.slot == null && s.id !== naSala).length;
    if (!n) return;
    const [x, y] = P(18.4, 12.2, 2);
    areas.push({ tipo: "fila", n, x0: x - 12, x1: x + 12, y0: y - 6, y1: y + 4 });
    rotulos.push({ cls: "room busy", texto: E.t("cena.semMesa", { n }), em: P(18.0, 12.0, 6) });
  }

  function montar() {
    objetos = []; areas = []; rotulos = [];
    naSala = escolherReuniao();
    gestor(); copa();
    retrato.ambientes.forEach(salaDeTeste);
    add({ x: 18.94, y: 0, z: 0, w: 0.12, d: 3.2, h: 30, draw() { drawBox({ ...this, c: COR.PAREDE_SALA }); } });
    salaDeReuniao(); cantos();
    arranjo.mesas.forEach((m, i) => mesa(retrato.sessoes.find((s) => s.slot === i), m));
    semMesa();
    (arranjo.etiquetas || []).forEach((em, i) => {
      const nomes = [...new Set(retrato.sessoes.filter((s) => arranjo.grupos[i].includes(s.slot)).map((s) => s.repoNome || semRepo()))];
      if (nomes.length) rotulos.push({ cls: "zone", texto: nomes.join(" + "), em: P(...em) });
    });
    tapetesDoRepo = tapetesPorRepo();
    ordem = E.ordenar(objetos);
  }

  Object.assign(E, {
    Cena: {
      definir(novo, sel, nomeArranjo) {
        trocarArranjo(nomeArranjo || "fileiras");
        SALAS_X = salasPara(novo.ambientes.length); E.SALAS_X = SALAS_X;
        retrato = { ...novo, sessoes: distribuir(novo.sessoes) };
        selecionado = sel;
        const hora = new Date().getHours();
        noite = hora >= 19 || hora < 6;
        montar(); fundo = E.pintarFundo(retrato, noite, { ...arranjo, tapetes: [...arranjo.tapetes, ...tapetesDoRepo] });
      },
      selecionar(id) { selecionado = id; },
      destacar(ids) { destacadas = new Set(ids); },
      areas: () => areas, rotulos: () => rotulos,
      desenhar(t) {
        const g = E.contexto();
        g.drawImage(fundo.canvas, 0, 0);
        E.detalhesDoFundo(fundo, t);
        baloes = []; cabecas.clear();
        for (const o of ordem) o.draw(t);
        E.raioDeConflito(retrato.conflitos, cabecas, t);
        E.iluminar(retrato, noite, arranjo.pendentes, SALAS_X, arranjo.mesas.map((m) => [m.x, m.y]), t);
        baloes.forEach((b) => E.balao(b[0], b[1], b[2], b[3], t));
      },
    },
    SALAS_X, CW, CH, W, D, H, quad, wallX, wallY, rect, line,
  });
})();
