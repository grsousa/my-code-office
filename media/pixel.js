// Primitivas de pixel art isométrico (sem antialias), sprites de gente, balões e móveis.
"use strict";
(function () {
  const E = (window.Escritorio = window.Escritorio || {});
  const CW = 288, CH = 208, OX = 120, OY = 66, W = 20, D = 14, H = 56;
  let g = null;

  const P = (x, y, z = 0) => [OX + (x - y) * 8, OY + (x + y) * 4 - z];
  const usar = (ctx) => { g = ctx; };
  const contexto = () => g;

  function rect(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function px(x, y, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); }

  function intersecoes(pts, yc) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      if ((p[1] <= yc && q[1] > yc) || (q[1] <= yc && p[1] > yc)) xs.push(p[0] + (yc - p[1]) * (q[0] - p[0]) / (q[1] - p[1]));
    }
    return xs.sort((m, n) => m - n);
  }
  function poly(pts, c) {
    g.fillStyle = c;
    const ys = pts.map((p) => p[1]);
    for (let y = Math.ceil(Math.min(...ys) - 0.5); y <= Math.floor(Math.max(...ys) - 0.5); y++) {
      const xs = intersecoes(pts, y + 0.5);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const x0 = Math.ceil(xs[k] - 0.5), x1 = Math.floor(xs[k + 1] - 0.5);
        if (x1 >= x0) g.fillRect(x0, y, x1 - x0 + 1, 1);
      }
    }
  }
  function line(a, b, c) {
    let [x0, y0] = a.map(Math.round);
    const [x1, y1] = b.map(Math.round);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let erro = dx + dy;
    g.fillStyle = c;
    for (;;) {
      g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * erro;
      if (e2 >= dy) { erro += dy; x0 += sx; }
      if (e2 <= dx) { erro += dx; y0 += sy; }
    }
  }
  const quad = (x0, y0, x1, y1, z, c) => poly([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], c);
  const wallY = (x0, x1, z0, z1, c, y = 0) => poly([P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)], c);
  const wallX = (y0, y1, z0, z1, c, x = 0) => poly([P(x, y0, z0), P(x, y1, z0), P(x, y1, z1), P(x, y0, z1)], c);

  function contorno(o, c) {
    const { x, y, z, w, d, h } = o;
    const s = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z), P(x, y + d, z + h)];
    for (let i = 0; i < s.length; i++) line(s[i], s[(i + 1) % s.length], c.e);
    if (c.hi) { line(P(x, y + d, z + h), P(x + w, y + d, z + h), c.hi); line(P(x + w, y + d, z + h), P(x + w, y, z + h), c.hi); }
  }
  function drawBox(o) {
    const { x, y, z, w, d, h } = o, c = o.c;
    poly([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)], c.l);
    poly([P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)], c.r);
    poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], c.t);
    if (c.e) contorno(o, c);
  }
  function glassBox(o) {
    const { x, y, z, w, d, h } = o;
    g.globalAlpha = 0.22;
    poly([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)], "#bfe3f5");
    poly([P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)], "#9fcbe3");
    g.globalAlpha = 1;
    line(P(x, y + d, z + h), P(x + w, y + d, z + h), "#d9e6ec");
    line(P(x + w, y + d, z + h), P(x + w, y, z + h), "#d9e6ec");
    line(P(x + w, y + d, z), P(x + w, y + d, z + h), "#d9e6ec");
    line(P(x, y + d, z), P(x, y + d, z + h), "#aebfca");
  }

  const COR = {
    WOOD: { t: "#b07a4a", l: "#8d5c37", r: "#6d4428", e: "#2c1a12", hi: "#cf9a63" },
    WALNUT: { t: "#7b4a32", l: "#5e3725", r: "#47291b", e: "#1f120c", hi: "#9a6346" },
    DARK: { t: "#3a3542", l: "#2c2833", r: "#211e27", e: "#121016" },
    CHAIR: { t: "#4a3f5c", l: "#3a3049", r: "#2d2539", e: "#15111b" },
    MUG: { t: "#f4efe6", l: "#ddd4c6", r: "#c4baa9" },
    PAREDE_SALA: { t: "#d7cfc4", l: "#b6ada3", r: "#8f867d", e: "#2a2522" },
    ESTADO: { esperando: "#ffd447", cafe: "#86cf86", digitando: "#8cc3ef", pensando: "#8cc3ef", reuniao: "#b9a0ea", dormindo: "#4a4256" },
  };

  function shade(hex, fator) {
    const n = parseInt(hex.slice(1), 16);
    const canal = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * fator)));
    return "#" + [16, 8, 0].map((s) => canal(s).toString(16).padStart(2, "0")).join("");
  }

  // Aparência estável por conversa: deriva do id.
  const CABELOS = ["#2a1a14", "#6b3d22", "#1c1c24", "#b8742f", "#3a2a20", "#5a2e1e", "#d8c27a", "#141418"];
  const PELES = ["#c98d63", "#f0c39b", "#e3b088", "#f2c9a5", "#a86d47", "#e8b48a", "#f1cfb1", "#8d5a3b"];
  const CAMISAS = ["#4f7f6a", "#7f5aa8", "#3f6fa8", "#c9643b", "#d1a23c", "#5d8f4a", "#8a6b9e", "#3e8a8a"];
  const ESTILOS = ["curto", "longo", "coque", "cacheado", "bone"];
  function aparencia(id) {
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const pega = (lista, salto) => lista[(h >>> salto) % lista.length];
    return { hair: pega(CABELOS, 0), skin: pega(PELES, 5), shirt: pega(CAMISAS, 10), style: pega(ESTILOS, 15) };
  }

  Object.assign(E, { CW, CH, W, D, H, P, usar, contexto, rect, px, poly, line, quad, wallY, wallX, drawBox, glassBox, COR, shade, aparencia });
})();
