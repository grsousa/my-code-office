"use strict";
// "Tirar do escritório": a mesa some e volta sozinha com atividade nova. Roda numa casa temporária.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const RETRATO = path.join(__dirname, "..", "src", "retrato.js").replace(/\\/g, "/");
const CONFIG = "{horasVisiveis:12,minutosCochilo:60,tokensCansado:4e5,arquivoAmbientes:'x',arquivoAvisos:'x',ambientes:['dev']}";
const ids = (casa, extra = "") => execFileSync(process.execPath, ["-e",
  `const r=require('${RETRATO}');${extra}console.log(JSON.stringify(r.montarRetrato(${CONFIG},()=>{}).sessoes.map(s=>({id:s.id,at:s.atualizado}))))`],
  { encoding: "utf8", env: { ...process.env, HOME: casa, USERPROFILE: casa } });

test("tirar do escritório esconde até haver atividade nova", () => {
  const casa = fs.mkdtempSync(path.join(os.tmpdir(), "mco-dispensar-"));
  const pasta = path.join(casa, ".claude", "projects", "p");
  fs.mkdirSync(pasta, { recursive: true });
  const transcript = path.join(pasta, "conversa-1.jsonl");
  fs.writeFileSync(transcript, JSON.stringify({ type: "user", message: { content: "oi" } }) + "\n");
  const [sessao] = JSON.parse(ids(casa));
  assert.equal(sessao.id, "conversa-1");
  assert.deepEqual(JSON.parse(ids(casa, `r.dispensar('conversa-1',${sessao.at});`)), []);
  const depois = new Date(Date.now() + 5000);
  fs.utimesSync(transcript, depois, depois);
  assert.equal(JSON.parse(ids(casa))[0].id, "conversa-1", "volta com atividade nova");
});
