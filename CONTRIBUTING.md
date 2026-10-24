# Desenvolvimento do My Code Office

## Rodar e empacotar

```bash
node --test --test-force-exit test/*.test.js   # testes (node:test, sem dependências)
node scripts/previa.js real    # previa/index.html com as conversas reais desta máquina
node scripts/previa.js demo    # idem, com todos os estados forçados
npx @vscode/vsce@2.32.0 package --no-dependencies --allow-missing-repository --skip-license
powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1 [-ComHooks]
```

`IDIOMA=en` e `AMBIENTES=dev,hmg` mudam a prévia.

## Estrutura

- `extension.js`: ativação, comandos e migração do nome antigo.
- `src/`: roda na extensão (Node). `retrato.js` monta o estado das conversas, `transcripts.js` lê os históricos, `git.js` os commits sem push, `busca.js` a busca, `quadros.js` ambientes e avisos, `visao.js` o webview.
- `media/`: roda no webview. `pixel.js` tem as primitivas, `sprites.js` as pessoas e os móveis, `ambiente.js` o fundo, a luz e a profundidade, `cena.js` monta o escritório, `lateral.js` a fila e o detalhe, `painel.js` o HUD e a busca, `textos.js` o dicionário pt-BR/en (compartilhado com a extensão).
- `hooks/registrar.js`: o hook do Claude Code. É copiado para `~/.claude/my-code-office/hooks/` e roda sozinho.
- `configurador/`: a entrevista (`aplicar.js --detectar`, `aplicar.js <respostas.json>`, `--restaurar`, `--migrar`) e os modelos das skills em `modelos/<idioma>/`.

## De onde vem o estado

- **Sem hooks:** a extensão lê o começo (64 KB) e o fim (384 KB) de cada transcript em `~/.claude/projects/*/*.jsonl`. Dá para saber se a conversa terminou o turno, está rodando ferramenta, chamou subagente, foi interrompida ou está parada. Não dá para saber se ela espera uma **permissão**.
- **Com hooks:** `registrar.js` roda em `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Notification`, `Stop`, `SubagentStop` e `SessionEnd` e grava `~/.claude/my-code-office/sessoes/<id>.json` (trava de arquivo + gravação atômica). Isso dá o estado exato, o pedido de permissão, os subagentes em segundo plano e o repo realmente **editado** (pelo `file_path` de Edit, Write, MultiEdit e NotebookEdit; leituras não contam). O hook nunca falha para fora: qualquer erro sai com código 0. Custa ~100 ms por evento.
- **Branch:** lida do `.git/HEAD` do repo editado. A branch gravada no transcript é a da pasta onde a conversa abriu, que pode não ser o repo em que ela trabalha; por isso só aparece repo e branch de quem editou algo.

`scripts/configurar-hooks.js instalar | remover | status` edita `~/.claude/settings.json`, guarda `settings.json.antes-my-code-office-<data>` a cada gravação e é idempotente.

