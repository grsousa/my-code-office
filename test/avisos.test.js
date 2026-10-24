"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { lerAvisos, marcarAviso } = require("../src/quadros");

function arquivoCom(conteudo) {
  const arquivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "avisos-")), "avisos.md");
  fs.writeFileSync(arquivo, conteudo);
  return arquivo;
}

test("lê avisos simples e no formato de tarefa", () => {
  const arquivo = arquivoCom("# Quadro\n\nTexto solto\n- antigo sem caixa\n- [ ] pendente\n- [x] feito\n");
  assert.deepEqual(lerAvisos(arquivo), [
    { linha: 3, texto: "antigo sem caixa", feito: false },
    { linha: 4, texto: "pendente", feito: false },
    { linha: 5, texto: "feito", feito: true },
  ]);
});

test("marcar e desmarcar reescreve só a linha do aviso", () => {
  const arquivo = arquivoCom("# Quadro\n- antigo sem caixa\n- [x] feito\n");
  assert.equal(marcarAviso(arquivo, 1, "antigo sem caixa", true), true);
  assert.equal(marcarAviso(arquivo, 2, "feito", false), true);
  assert.equal(fs.readFileSync(arquivo, "utf8"), "# Quadro\n- [x] antigo sem caixa\n- [ ] feito\n");
});

test("preserva fins de linha CRLF", () => {
  const arquivo = arquivoCom("# Quadro\r\n- [ ] um\r\n- [ ] dois\r\n");
  assert.equal(marcarAviso(arquivo, 1, "um", true), true);
  assert.equal(fs.readFileSync(arquivo, "utf8"), "# Quadro\r\n- [x] um\r\n- [ ] dois\r\n");
});

test("não mexe se o texto da linha mudou no meio do caminho", () => {
  const arquivo = arquivoCom("- [ ] um\n- [ ] dois\n");
  assert.equal(marcarAviso(arquivo, 0, "dois", true), false);
  assert.equal(marcarAviso(arquivo, 9, "um", true), false);
  assert.equal(fs.readFileSync(arquivo, "utf8"), "- [ ] um\n- [ ] dois\n");
});

test("CLI do quadro: cria sem duplicar, marca por trecho sem acento e reabre pelo número", () => {
  const { spawnSync } = require("child_process");
  const arquivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mco-aviso-")), "avisos.md");
  const cli = (...a) => spawnSync(process.execPath, [path.join(__dirname, "..", "bin", "aviso.js"), ...a, "--arquivo", arquivo], { encoding: "utf8" });
  cli("novo", "Rodar a migração em hmg"); cli("novo", "Rodar a migração em hmg"); cli("novo", "Pedir a planilha da LAI");
  assert.equal((fs.readFileSync(arquivo, "utf8").match(/- \[ \]/g) || []).length, 2);
  assert.equal(cli("feito", "MIGRACAO").status, 0);
  assert.match(fs.readFileSync(arquivo, "utf8"), /- \[x\] Rodar a migração em hmg/);
  assert.equal(cli("feito", "inexistente").status, 1);
  assert.equal(cli("reabrir", "1").status, 0);
  assert.match(cli("listar").stdout, /1\. \[ \] Rodar a migração em hmg\n2\. \[ \] Pedir a planilha da LAI/);
});
