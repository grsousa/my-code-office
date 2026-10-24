// Liga/desliga os hooks do My Code Office (atalho para desenvolvimento; a entrevista faz o mesmo).
// Uso: node scripts/configurar-hooks.js instalar | remover | status
"use strict";
const hooks = require("../configurador/hooks");
const { copiarFerramentas } = require("../configurador/aplicar");

const acao = process.argv[2];
if (acao === "instalar") hooks.instalar(copiarFerramentas().registrar);
else if (acao === "remover") hooks.remover();
else if (acao !== "status") { console.error("Uso: node scripts/configurar-hooks.js instalar | remover | status"); process.exit(1); }
const ligados = hooks.status();
console.log(ligados.length ? `Hooks do My Code Office ligados em: ${ligados.join(", ")}` : "Hooks do My Code Office desligados.");
