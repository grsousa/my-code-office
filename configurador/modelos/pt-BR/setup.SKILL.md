---
name: my-code-office
description: Entrevista de configuração do My Code Office (extensão do VS Code) — pergunta nome, repos, ambientes de teste do time, estado ao vivo (hooks) e preferências, e gera as skills /branches, /conversa e /aviso, a tabela de ambientes, o quadro de avisos e a configuração do painel. Use quando a pessoa digitar /my-code-office, pedir para configurar ou reconfigurar o My Code Office (o escritório das conversas), ou disser que acabou de instalar a extensão.
---

# /my-code-office

Você vai entrevistar a pessoa para configurar o My Code Office, o escritório em pixel art das conversas do Claude Code. Tom acolhedor e direto,
em português. Pergunte o mínimo: **detecte antes** tudo o que der e só confirme.

## 0. Abertura (uma mensagem curta)

Diga em 2 ou 3 frases: o que vai ser configurado; que leva uns 3 minutos; que **nada é gravado
antes de ela ver o resumo e confirmar**; e que tudo ganha backup automático, com um comando para desfazer.

## 1. Detectar (sem perguntar nada ainda)

```bash
node "{{APLICAR}}" --detectar
```

Devolve JSON com: nome e e-mail do git, repos encontrados (caminho, branch principal, último
commit seu, se tem remoto), configuração anterior (se esta não for a primeira vez), skills
existentes, situação dos hooks e versão do Node. Se `anterior` vier preenchido, é uma
**reconfiguração**: mostre as respostas antigas e pergunte só o que ela quer mudar.

## 2. Perguntar (AskUserQuestion, no máximo 4 perguntas por rodada)

**Regras de clareza (a janela de perguntas cobre o texto da conversa):**
- Cada pergunta se explica sozinha. Nunca escreva "listados acima", "como dito antes" ou
  "os N recomendados" sem mostrar quais são. O que a pessoa precisa ver para decidir vai
  **dentro** da pergunta: nas opções ou na descrição delas.
- Título e opções em linguagem do dia a dia, pelo **efeito prático** ("mostrar quando uma conversa
  espera sua aprovação"), nunca pelo mecanismo ("hooks", "settings.json", "fetch", "transcripts").
  O detalhe técnico, se for útil, vai na descrição da opção, depois do efeito.
- O `header` (etiqueta curta) também é sem jargão: "Aprovações", não "Hooks".

**Rodada 0, idioma** (só na primeira vez, ou se pedirem para mudar): header "Idioma". "Em que idioma
você quer o painel e as skills geradas?" Opções: "Português (Brasil)" e "English", com o idioma do sistema
(`idiomaSugerido` da detecção) marcado como recomendado. Se a pessoa escolher English, siga a entrevista
em inglês dali em diante. Grave em `idioma` ("pt-BR" ou "en").

**Rodada 1, você:**
- Como chamar a pessoa (opções: o nome do git e o primeiro nome; "Other" para digitar).
- Como o painel trata quem coordena: "gestora", "gestor" ou "pelo nome". Grave o título pronto em `tituloFila` (ex.: "Fila da gestora", "Fila da Ana", "Fila do Bruno").
- Apelido para o Claude, usado como gatilho das skills (ex.: "jarvis, como estão minhas branches?").
  Opções: "Sem apelido", "Jarvis"; "Other" para digitar.

**Rodada 2, repos (os próprios repos são as opções):** use `multiSelect: true` e ponha cada repo
como uma opção marcável: `label` = nome do repo; `description` = "último commit seu em DD/MM ·
branch principal X" (ou "sem commits seus", "sem servidor remoto: o trabalho só existe nesta máquina").
Agrupe em até 4 perguntas de até 4 opções, cada uma com título claro, nesta ordem:
1. "Repos com commits seus nos últimos 30 dias (marque os que quer acompanhar)": os mais recentes primeiro.
2. Se sobrar, "Mais repos com commits recentes".
3. "Repos parados (sem commits seus há mais de 30 dias): quer acompanhar algum?"
Se houver mais repos do que cabem, diga na descrição da última opção que dá para digitar outros
em "Other". Se nenhum repo foi detectado, pergunte a pasta onde ficam e rode `--detectar --pasta "<pasta>"`.
Na reconfiguração, marque como "(acompanhado hoje)" na descrição os que já estavam na lista.

**Rodada 3, time e ambientes:**
- Ambientes de teste compartilhados (máximo 4; viram salas no escritório): "dev, tst e hmg",
  "dev e hmg", "Não temos ambientes compartilhados"; "Other" para digitar separados por vírgula.
- Como o time combina quem usa cada ambiente: "De boca", "Planilha ou quadro", "Canal no chat", "Não combinamos".
- Quantas pessoas dividem esses ambientes: "2 a 3", "4 a 6", "7 ou mais".

**Rodada 4, comportamento:**
- header "Aprovações". Pergunta: "Quer que o painel mostre quando uma conversa está esperando sua
  aprovação para continuar?" Opções:
  - "Sim, mostrar (recomendado)": "Também mostra na hora quem terminou, quem está em reunião com
    subagentes e em qual repo cada conversa está mexendo. Para isso o Claude Code passa a avisar o
    painel a cada passo das conversas (fica nas configurações do Claude Code, com cópia de segurança).
    Dá para desligar depois."
  - "Não, só o básico": "O painel deduz o estado pelo histórico das conversas, com alguns segundos de
    atraso, e não mostra pedidos de aprovação."
  Se `node` não foi detectado, não ofereça o "Sim": explique que precisa do Node.js instalado.
- header "Servidor". Pergunta: "Antes do relatório de branches, posso buscar no servidor o que mudou
  (git fetch)?" Opções: "Não, eu mesma(o) atualizo": "Bom se a sua chave do Git pede senha; o relatório
  avisa quando a informação do servidor estiver velha." / "Sim, pode buscar": "Só busca; nunca envia nada (push)."
- header "Mesas". "Como as mesas ficam arrumadas no escritório?": "Em fileiras, com tapete por repo
  (recomendado)": "Mais espaço; mesas do mesmo repo dividem um tapete com o nome" / "Em baias de 4 por
  repo": "Mais agrupado, mais apertado".
- header "Avisos". "Quer começar o quadro de avisos com alguma pendência?" (ex.: "rodar a migração X
  antes de prod"): "Não por enquanto" / "Sim, vou digitar": "Escreva em Other, uma por linha".

## 3. Resumo e confirmação

Grave as respostas em `~/.claude/my-code-office/respostas.json` (formato abaixo) e mostre um resumo
em tabela: o que vai ser **criado**, o que vai ser **substituído** e o que **não muda**. Pergunte:
"Aplicar", "Quero ajustar algo", "Cancelar". Só siga com "Aplicar".
Como a janela de perguntas cobre a tabela, a **descrição** da opção "Aplicar" repete o essencial em
uma linha (ex.: "Cria /branches com 11 repos, /conversa e /aviso; salas dev/tst/hmg; mostra aprovações; 2 avisos
novos. Faz cópia de segurança antes."), e a pergunta lembra que dá para recolher a janela (seta no
canto) para ver o resumo completo.

```json
{
  "idioma": "pt-BR", "nome": "Ana", "tratamento": "gestora", "tituloFila": "Fila da gestora", "apelido": "jarvis",
  "repos": ["C:/caminho/repo-a", "C:/caminho/repo-b"],
  "ambientes": ["dev", "tst", "hmg"], "combinado": "de boca", "tamanhoTime": "4 a 6",
  "hooks": true, "podeFetch": false, "arranjo": "fileiras",
  "avisos": ["Rodar a migração X antes de prod"]
}
```

## 4. Aplicar

```bash
node "{{APLICAR}}" "~/.claude/my-code-office/respostas.json"
```

O script faz backup de tudo que vai tocar, gera os arquivos e imprime o que fez e a pasta do backup.
Termine dizendo:
- o que foi criado (skills `/branches`, `/conversa` e `/aviso`, tabela de ambientes, avisos, configuração);
- que é preciso rodar **Developer: Reload Window** no VS Code para o painel ler a configuração;
- se ligou os hooks, que eles valem a partir do próximo evento das conversas;
- **como desfazer**: `node "{{APLICAR}}" --restaurar "<pasta do backup>"`;
- que dá para rodar `/my-code-office` de novo a qualquer momento para mudar respostas.

Nunca edite `settings.json`, skills ou a tabela de ambientes à mão durante a entrevista: tudo passa
pelo script, que é quem faz o backup.
