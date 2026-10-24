// Sprites: trabalhadores (12x13), balões de estado e móveis animados.
"use strict";
(function () {
  const E = window.Escritorio;
  const { P, rect, px, line, drawBox, shade, COR } = E;

  const ROSTO = [
    "...oooooo...", "..ohhhhhho..", ".ohhhhhhhho.", ".ohssssssho.", ".osesssseso.", ".osssmmssso.", "..osssssso..",
    "....osso....", ".occccccccco", "occccccccccc", "occcCccCccco", "occccccccccc", "ossccccccsso",
  ];

  function paleta(look) {
    return { o: "#1d1218", h: look.hair, s: look.skin, e: "#1d1218", m: shade(look.skin, 0.72), c: look.shirt, C: shade(look.shirt, 0.75) };
  }

  function corpo(sx, sy, pal, st, t) {
    const fechado = st === "dormindo" || st === "cafe";
    const queda = st === "dormindo" ? 3 : 0;
    const balanco = st === "digitando" && Math.floor(t / 180) % 2 ? 1 : 0;
    ROSTO.forEach((linha, r) => {
      const dy = r <= 7 ? queda + balanco : 0;
      for (let k = 0; k < 12; k++) {
        let ch = linha[k];
        if (ch === "." || (r === 12 && ch === "s" && st === "esperando")) continue;
        if (ch === "e" && fechado) ch = "s";
        px(sx + k, sy + r + dy, pal[ch]);
      }
    });
    const hy = sy + queda + balanco;
    if (fechado) { rect(sx + 2, hy + 4, 2, 1, pal.e); rect(sx + 8, hy + 4, 2, 1, pal.e); }
    return hy;
  }

  const CABELO = {
    longo(sx, hy, pal) { for (let r = 3; r <= 8; r++) { px(sx + 1, hy + r, pal.h); px(sx + 10, hy + r, pal.h); } },
    coque(sx, hy, pal) { rect(sx + 4, hy - 2, 4, 2, pal.h); line([sx + 4, hy - 3], [sx + 7, hy - 3], pal.o); },
    cacheado(sx, hy, pal) { [2, 4, 6, 8, 10].forEach((k) => { px(sx + k, hy - 1, pal.h); px(sx + k, hy - 2, pal.o); }); },
    bone(sx, hy) { rect(sx + 2, hy, 8, 2, "#c94f3d"); rect(sx + 1, hy + 2, 10, 1, "#c94f3d"); rect(sx - 1, hy + 3, 5, 1, "#9e3527"); },
    curto() {},
  };

  const GESTO = {
    digitando(sx, sy, hy, pal, t) { const f = Math.floor(t / 120) % 2; px(sx + 2, sy + 12 - f, pal.s); px(sx + 9, sy + 11 + f, pal.s); },
    pensando(sx, sy, hy, pal) { px(sx + 8, hy + 6, pal.s); px(sx + 9, hy + 7, pal.s); px(sx + 9, hy + 8, pal.c); },
    esperando(sx, sy, hy, pal, t) {
      const aceno = Math.floor(t / 260) % 2;
      for (let r = 2; r <= 8; r++) px(sx + 11 + (r < 5 ? aceno : 0), hy + r, r < 4 ? pal.s : pal.c);
      px(sx + 12 + aceno, hy + 1, pal.s); px(sx + 11 + aceno, hy + 1, pal.s);
    },
    cafe(sx, sy, hy, pal, t) {
      rect(sx + 8, sy + 9, 3, 3, "#f4efe6"); px(sx + 11, sy + 10, "#f4efe6"); px(sx + 9, sy + 9, "#6b3f24");
      const k = Math.floor(t / 300) % 3; px(sx + 9 + (k % 2), sy + 7 - k, "#ffffffaa");
    },
  };

  function pessoa(sx, sy, look, st, t, opcoes = {}) {
    const pal = paleta(look);
    const hy = corpo(sx, sy, pal, st, t);
    (CABELO[look.style] || CABELO.curto)(sx, hy, pal);
    if (opcoes.fone) { px(sx + 1, hy + 4, "#222"); px(sx + 10, hy + 4, "#222"); line([sx + 10, hy + 5], [sx + 8, hy + 6], "#222"); }
    if (opcoes.cansado && st !== "dormindo" && st !== "cafe") { px(sx + 3, hy + 5, "#7d5a7e"); px(sx + 8, hy + 5, "#7d5a7e"); }
    if (GESTO[st]) GESTO[st](sx, sy, hy, pal, t);
  }

  const GLIFO = {
    "!": ["..#..", "..#..", "..#..", ".....", "..#.."],
    v: ["....#", "...#.", "#.#..", ".#...", "....."],
    z: ["####.", "..#..", ".#...", "####.", "....."],
  };
  function balao(cx, topo, tipo, cor, t) {
    const pula = tipo === "!" ? Math.round(Math.sin(t / 160)) : 0;
    const x = Math.round(cx - 4), y = Math.round(topo - 11 + pula);
    rect(x, y, 9, 8, "#1d1218"); rect(x + 1, y - 1, 7, 10, "#1d1218"); rect(x + 1, y, 7, 8, cor);
    px(x + 3, y + 9, "#1d1218"); px(x + 4, y + 9, "#1d1218"); px(x + 4, y + 10, "#1d1218"); px(x + 3, y + 8, cor); px(x + 4, y + 8, cor);
    if (tipo === "...") { const n = Math.floor(t / 300) % 4; for (let i = 0; i < n && i < 3; i++) px(x + 2 + i * 2, y + 4, "#1d1218"); return; }
    const glifo = GLIFO[tipo];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 5; k++) if (glifo[r][k] === "#") px(x + 2 + k, y + 1 + r + (tipo === "!" ? 0 : 1), "#1d1218");
  }

  function estante(o) {
    drawBox({ ...o, c: COR.WALNUT });
    const cores = ["#c9643b", "#5d8f4a", "#3f6fa8", "#d1a23c", "#8a6b9e", "#e8dcc2", "#b84a4a"];
    [3, 12, 21, 30].forEach((zr, r) => {
      for (let k = 0; k < 9; k++) line(P(o.x + o.w, o.y + 0.12 + k * 0.18, zr + 1), P(o.x + o.w, o.y + 0.12 + k * 0.18, zr + 5 + ((k * 7 + r * 3) % 3)), cores[(k + r * 2) % cores.length]);
      line(P(o.x + o.w, o.y, zr), P(o.x + o.w, o.y + o.d, zr), "#2b170e");
    });
  }
  function abajur(o) {
    line(P(o.x + 0.15, o.y + 0.15, 11), P(o.x + 0.15, o.y + 0.15, 18), "#2b2731");
    drawBox({ x: o.x - 0.05, y: o.y - 0.05, z: 17, w: 0.4, d: 0.4, h: 4, c: { t: "#ffd98a", l: "#f2b35b", r: "#c98a34", e: "#3b2410" } });
  }
  function rack(o, t, ocupado) {
    drawBox({ ...o, c: { t: "#3a3d48", l: "#2a2d36", r: "#20222a", e: "#0e0f13" } });
    for (let r = 0; r < 5; r++) for (let k = 0; k < 2; k++) {
      const [lx, ly] = P(o.x + 0.12 + k * 0.25, o.y + o.d, 4 + r * 5);
      const aceso = (Math.floor(t / (300 + r * 70 + k * 130)) + r + k) % 3 !== 0;
      px(lx, ly, aceso ? (ocupado ? (r % 2 ? "#ffd447" : "#7ee08a") : "#3d6b45") : "#1a1c22");
    }
  }
  function planta(o, t) {
    drawBox({ ...o, c: { t: "#4a2a1c", l: "#b0563a", r: "#8a3f2a", e: "#2a140c" } });
    const [cx, cy] = P(o.x + 0.25, o.y + 0.25, 7), balanco = Math.round(Math.sin(t / 900));
    const folhas = ["#5f9b55", "#7cbf6a", "#4b7f45"];
    [[-3, -3], [3, -3], [-2, -6], [2, -6], [0, -9], [-4, -7], [4, -7], [0, -4], [1, -12], [-1, -11]].forEach(([dx, dy], i) => {
      rect(cx + dx + (dy < -6 ? balanco : 0), cy + dy, 2, 2, folhas[i % 3]);
    });
  }
  function correio(o, t) {
    line(P(o.x + 0.35, o.y + 0.3, 0), P(o.x + 0.35, o.y + 0.3, 8), "#2b2731");
    drawBox({ x: o.x, y: o.y, z: 8, w: o.w, d: o.d, h: 7, c: { t: "#5b8ed0", l: "#3e6fb0", r: "#2f5791", e: "#14223a" } });
    const ergue = o.cheio ? Math.floor(t / 700) % 2 : 0;
    const [fx, fy] = P(o.x + o.w, o.y + 0.1, 15);
    line([fx, fy], [fx, fy - 6 - ergue], "#2b2731");
    if (o.cheio) rect(fx + 1, fy - 6 - ergue, 3, 2, "#f07160");
  }
  function vapor(x, y, z, t) {
    const [mx, my] = P(x, y, z), k = Math.floor(t / 350) % 3;
    px(mx + (k % 2), my - k, "#ffffff88");
  }

  Object.assign(E, { pessoa, balao, estante, abajur, rack, planta, correio, vapor });
})();
