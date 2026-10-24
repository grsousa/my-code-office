// Fundo estático (piso, paredes, janela, quadro), ordenação por profundidade, luz e relógio.
"use strict";
(function () {
  const E = window.Escritorio;
  const { CW, CH, W, D, H, P, rect, px, line, quad, wallY, wallX, poly } = E;
  const RELOGIO = [11.2, 0, 41];

  // ---------- profundidade: ordenação topológica de caixas isométricas ----------
  function caixaNaTela(o) {
    const cantos = [];
    for (const dx of [0, o.w]) for (const dy of [0, o.d]) for (const dz of [0, o.h]) cantos.push(P(o.x + dx, o.y + dy, o.z + dz));
    const xs = cantos.map((c) => c[0]), ys = cantos.map((c) => c[1]);
    return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  }
  const sobrepoe = (a, b) => a[0] <= b[1] && b[0] <= a[1] && a[2] <= b[3] && b[2] <= a[3];
  const atras = (a, b) => a.x + a.w <= b.x + 1e-3 || a.y + a.d <= b.y + 1e-3 || a.z + a.h <= b.z + 1e-3;
  const chave = (o) => o.x + o.w / 2 + o.y + o.d / 2 + o.z / 100;

  function arestas(objetos) {
    const telas = objetos.map(caixaNaTela), saidas = objetos.map(() => []), entradas = objetos.map(() => 0);
    for (let i = 0; i < objetos.length; i++) for (let j = i + 1; j < objetos.length; j++) {
      if (!sobrepoe(telas[i], telas[j])) continue;
      const ij = atras(objetos[i], objetos[j]), ji = atras(objetos[j], objetos[i]);
      const iPrimeiro = ij !== ji ? ij : chave(objetos[i]) <= chave(objetos[j]);
      const [de, para] = iPrimeiro ? [i, j] : [j, i];
      saidas[de].push(para); entradas[para]++;
    }
    return { saidas, entradas };
  }
  function ordenar(objetos) {
    const { saidas, entradas } = arestas(objetos);
    const prontos = [], saida = [];
    entradas.forEach((n, i) => { if (!n) prontos.push(i); });
    while (prontos.length) {
      prontos.sort((a, b) => chave(objetos[b]) - chave(objetos[a]));
      const i = prontos.pop();
      saida.push(i);
      for (const j of saidas[i]) if (!--entradas[j]) prontos.push(j);
    }
    objetos.forEach((_, i) => { if (!saida.includes(i)) saida.push(i); });   // ciclo raro: desenha no fim
    return saida.map((i) => objetos[i]);
  }

  // ---------- fundo ----------
  function piso(tapetes) {
    const tons = ["#7a4f33", "#83563a", "#7e5236", "#76492f", "#86593b"];
    for (let i = 0; i < W; i++) for (let j = 0; j < D; j++) {
      quad(i, j, i + 1, j + 1, 0, tons[(i * 7 + j * 3) % 5]);
      line(P(i, j), P(i, j + 1), "#5f3b26");
    }
    const tapete = (x0, y0, x1, y1, c, b) => { quad(x0, y0, x1, y1, 0, b); quad(x0 + 0.15, y0 + 0.15, x1 - 0.15, y1 - 0.15, 0, c); };
    tapetes.forEach((args) => tapete(...args));
    quad(0, 9, 5.2, 14, 0, "#4f3553");
    for (let i = 0; i < 5.2; i += 1) line(P(i, 9), P(i, 14), "#5c4060");
    for (let i = E.SALAS_X.length ? E.SALAS_X[0] : 19; i < 19; i++) for (let j = 0; j < 3.2; j += 1) quad(i, j, i + 1, Math.min(j + 1, 3.2), 0, (i + Math.floor(j)) % 2 ? "#4b5463" : "#56606f");
  }
  function paredes() {
    wallY(0, W, 0, H, "#6b5878"); wallX(0, D, 0, H, "#55465f");
    wallY(0, W, 0, 14, "#5a4766"); wallX(0, D, 0, 14, "#463a50");
    line(P(0, 0, 14), P(W, 0, 14), "#8a76a0"); line(P(0, 0, 14), P(0, D, 14), "#6e5c80");
    line(P(0, 0), P(W, 0), "#2a1f30"); line(P(0, 0), P(0, D), "#2a1f30");
    poly([P(0, -0.3, H), P(W, -0.3, H), P(W, 0, H), P(0, 0, H)], "#cdb9da");
    poly([P(-0.3, 0, H), P(0, 0, H), P(0, D, H), P(-0.3, D, H)], "#b9a4c8");
    poly([P(W, -0.3, 0), P(W, 0, 0), P(W, 0, H), P(W, -0.3, H)], "#4b3d55");
    poly([P(-0.3, D, 0), P(0, D, 0), P(0, D, H), P(-0.3, D, H)], "#5e4c6b");
    line(P(0, 0, 0), P(0, 0, H), "#3a2d44");
  }
  function janela(noite) {
    wallY(1.9, 7.1, 15, 47, "#4a2e1f");
    const ceu = noite ? ["#2a3672", "#222c62", "#1b2350", "#151b3d"] : ["#bfe2f7", "#a2d2f2", "#86c0ea", "#6aaee0"];
    ceu.forEach((cor, k) => wallY(2.1, 6.9, 17 + k * 6.5, 17 + (k + 1) * 6.5, cor));
    const estrelas = [];
    for (let k = 0; noite && k < 22; k++) estrelas.push(P(2.3 + ((k * 37) % 44) / 10, 0, 21 + ((k * 53) % 21)));
    const [mx, my] = P(5.9, 0, 39), astro = noite ? "#f6efc9" : "#fff3b0";
    rect(mx - 2, my - 2, 4, 4, astro); rect(mx - 1, my - 3, 2, 6, astro); rect(mx - 3, my - 1, 6, 2, astro);
    wallY(4.45, 4.55, 17, 43, "#4a2e1f"); line(P(2.1, 0, 30), P(6.9, 0, 30), "#4a2e1f");
    poly([P(1.8, 0, 15), P(7.2, 0, 15), P(7.2, 0.35, 15), P(1.8, 0.35, 15)], "#cf9a63");
    return estrelas;
  }
  function relogioMoldura() {
    const [cx, cy] = P(...RELOGIO);
    rect(cx - 3, cy - 5, 7, 11, "#2c1a12"); rect(cx - 5, cy - 3, 11, 7, "#2c1a12"); rect(cx - 4, cy - 4, 9, 9, "#2c1a12");
    rect(cx - 2, cy - 4, 5, 9, "#f3ead8"); rect(cx - 4, cy - 2, 9, 5, "#f3ead8"); rect(cx - 3, cy - 3, 7, 7, "#f3ead8");
  }
  function quadroELousa(avisos) {
    wallX(2.8, 5.8, 18, 40, "#4a2e1f"); wallX(2.95, 5.65, 19.5, 38.5, "#b98b5a");
    const notas = [[3.1, 3.9, 29, 36, "#f4dc7a"], [4.2, 5.0, 30, 37, "#f2b3b8"], [3.6, 4.4, 21, 28, "#b8e0a8"], [4.6, 5.4, 21, 27, "#a8d0f0"]];
    notas.slice(0, Math.min(avisos.filter((a) => !a.feito).length, 4)).forEach(([y0, y1, z0, z1, cor]) => {
      wallX(y0, y1, z0, z1, cor); const [ax, ay] = P(0, (y0 + y1) / 2, z1 - 1); px(ax, ay, "#c43b30");
    });
    wallX(9.6, 12.6, 19, 38, "#9aa3ad"); wallX(9.75, 12.45, 20.5, 36.5, "#f4f6f4");
    line(P(0, 10, 33), P(0, 11.2, 33), "#3f6fa8"); line(P(0, 10, 30), P(0, 11.8, 30), "#3f6fa8");
    line(P(0, 10, 27), P(0, 11, 27), "#c94f3d"); line(P(0, 11.6, 25), P(0, 12.2, 31), "#5d8f4a");
  }
  function pintarFundo(retrato, noite, arranjo) {
    const canvas = document.createElement("canvas");
    canvas.width = CW; canvas.height = CH;
    const anterior = E.contexto();
    E.usar(canvas.getContext("2d"));
    rect(0, 0, CW, CH, "#120e16");
    piso(arranjo.tapetes);
    retrato.ambientes.forEach((amb, i) => {
      if (!amb.quem) return;
      const g = E.contexto(); g.globalAlpha = 0.18; quad(E.SALAS_X[i] + 0.1, 0.1, E.SALAS_X[i] + 1.9, 3, 0, "#ffd98a"); g.globalAlpha = 1;
    });
    paredes();
    const estrelas = janela(noite);
    relogioMoldura();
    quadroELousa(retrato.avisos || []);
    arranjo.pendentes.forEach(([lx, ly]) => line(P(lx, ly, H), P(lx, ly, 46), "#2a1f30"));
    E.usar(anterior);
    return { canvas, estrelas };
  }

  function detalhesDoFundo(fundo, t) {
    fundo.estrelas.forEach((s, i) => { if ((Math.floor(t / 700) + i) % 5) px(s[0], s[1], i % 3 ? "#cfd8ff" : "#ffffff"); });
    const agora = new Date(), [cx, cy] = P(...RELOGIO);
    const angulo = (v, m) => (v / m) * Math.PI * 2 - Math.PI / 2;
    const horas = angulo((agora.getHours() % 12) + agora.getMinutes() / 60, 12), minutos = angulo(agora.getMinutes(), 60);
    line([cx, cy], [cx + Math.cos(horas) * 2.2, cy + Math.sin(horas) * 2.2], "#2c1a12");
    line([cx, cy], [cx + Math.cos(minutos) * 3.4, cy + Math.sin(minutos) * 3.4], "#2c1a12");
  }

  function raioDeConflito(conflitos, cabecas, t) {
    if (Math.floor(t / 250) % 2) return;
    for (const [idA, idB] of conflitos) {
      const a = cabecas.get(idA), b = cabecas.get(idB);
      if (!a || !b) continue;
      let anterior = [a[0], a[1] - 4];
      for (let i = 1; i <= 7; i++) {
        const f = i / 7, ponto = [a[0] + (b[0] - a[0]) * f, a[1] - 4 + (b[1] - a[1]) * f + (i % 2 ? -3 : 3)];
        line(anterior, ponto, "#f07160"); anterior = ponto;
      }
    }
  }

  function brilho(g, x, y, raio, cor, alfa) {
    const grad = g.createRadialGradient(x, y, 0, x, y, raio);
    grad.addColorStop(0, cor.replace("A", alfa)); grad.addColorStop(1, cor.replace("A", 0));
    g.fillStyle = grad; g.fillRect(x - raio, y - raio, raio * 2, raio * 2);
  }
  const LUZ_DO_ESTADO = { esperando: "rgba(255,212,71,A)", cafe: "rgba(134,207,134,A)", digitando: "rgba(140,195,239,A)", pensando: "rgba(140,195,239,A)" };
  function iluminar(retrato, noite, pendentes, salasX, mesas, t) {
    const g = E.contexto();
    g.save();
    g.fillStyle = noite ? "rgba(14,8,30,.30)" : "rgba(20,10,35,.08)";
    g.fillRect(0, 0, CW, CH);
    g.globalCompositeOperation = "lighter";
    const [lx, ly] = P(2.2, 1.55, 19); brilho(g, lx, ly, 26, "rgba(255,190,110,A)", 0.3);
    pendentes.forEach(([px_, py_]) => { const [x, y] = P(px_, py_, 30); brilho(g, x, y + 12, 34, "rgba(255,200,130,A)", noite ? 0.12 : 0.16); });
    retrato.ambientes.forEach((amb, i) => { if (amb.quem) { const [x, y] = P(salasX[i] + 1, 1.5, 14); brilho(g, x, y, 22, "rgba(255,210,140,A)", 0.2); } });
    for (const s of retrato.sessoes) {
      const luz = LUZ_DO_ESTADO[s.estado];
      if (!luz || s.slot == null || !mesas[s.slot]) continue;
      const [mx, my] = mesas[s.slot], [x, y] = P(mx + 1, my + 0.3, 18);
      brilho(g, x, y, 16, luz, s.estado === "esperando" ? 0.18 + 0.1 * Math.sin(t / 200) : 0.14);
    }
    if (retrato.sessoes.some((s) => s.estado === "reuniao")) { const [x, y] = P(2.6, 11.4, 16); brilho(g, x, y, 30, "rgba(185,160,234,A)", 0.16); }
    g.restore();
  }

  Object.assign(E, { ordenar, pintarFundo, detalhesDoFundo, raioDeConflito, iluminar });
})();
