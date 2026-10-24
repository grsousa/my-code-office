---
name: conversa
description: Acha em qual conversa anterior do Claude Code um assunto foi tratado — busca no conteúdo de todas as conversas desta máquina (não só no título) e devolve as mais recentes, com trecho e comando para retomar. Use quando {{NOME}} perguntar "qual foi a última conversa sobre X", "em que conversa falamos de Y", "onde eu vi Z",{{APELIDO_GATILHO_CONVERSA}} ou pedir para retomar/continuar um assunto de outra conversa.
---

# /conversa

Busca um assunto em todos os transcripts (`~/.claude/projects/*/*.jsonl`), sem diferenciar
acento nem maiúscula. Todas as palavras precisam aparecer na mesma mensagem. A conversa
atual fica de fora (ela sempre contém o termo pesquisado).

## Como rodar

```bash
node "{{SCRIPT_BUSCA}}" "<assunto>" [--limite N]
```

- Leva ~2 s na primeira vez. Rode com timeout de 60000.
- Escolha 2 a 4 palavras que provavelmente aparecem no texto (nome de arquivo, função, card,
  tabela, termo técnico). Se não achar nada, tente sinônimos ou uma palavra só antes de
  responder que não existe.
- `--incluir-atual` inclui esta conversa (raro).

## Como responder

Em português, curto:
1. A conversa mais recente que tratou do assunto: título, data (converta de UTC para o fuso
   local, {{FUSO}}) e, em uma frase, o que foi dito lá, a partir do trecho.
2. Se houver outras relevantes, no máximo 3 linhas, uma por conversa.
3. Para retomar: o comando `claude --resume <id>` da escolhida. Pela extensão do VS Code,
   ela também aparece no histórico de conversas pelo título.

Se pedirem para **continuar** o assunto aqui, leia o trecho relevante do transcript (grep no
`.jsonl` com o termo; não abra o arquivo inteiro, alguns têm dezenas de MB) e traga o contexto.

O painel do **My Code Office** (extensão do VS Code) tem a mesma busca no campo do topo.

<!-- Gerado pela entrevista do My Code Office em {{DATA}}. -->
