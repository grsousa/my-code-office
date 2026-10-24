# My Code Office

**Suas conversas do Claude Code como um escritório em pixel art.** Cada mesa é uma conversa. De relance você vê quem está esperando você, quem já terminou, quem está em reunião com subagentes e em qual repo e branch cada uma está mexendo.

> Versão em inglês (principal, a do Marketplace): `README.md`.

<!-- Captura principal: entra quando o repositório público existir (o vsce exige o campo "repository" para imagens). -->

## Para quem é

Para quem toca várias conversas do Claude Code ao mesmo tempo e perde de vista qual delas parou pedindo permissão, qual terminou e qual mexeu na branch errada.

## Começar

1. Instale a extensão e abra a aba **Escritório** no painel inferior (onde ficam o Terminal e os Problemas).
2. Numa conversa do Claude Code, digite **`/my-code-office`**. É uma entrevista de uns 3 minutos: idioma, seu nome, os repos que você quer acompanhar e os ambientes de teste do time. Nada é gravado antes de você ver o resumo e confirmar, e tudo ganha cópia de segurança.
3. Pronto. As conversas aparecem nas mesas sozinhas.

Para mudar as respostas depois, rode `/my-code-office` de novo.

## O que você vê

| Na cena | Significa |
|---|---|
| Mão levantada, balão `!` amarelo | A conversa está esperando você: uma permissão ou uma resposta |
| Café, balão `✓` verde | Terminou: tem resultado para ler |
| Digitando, balão `…` | Pensando ou rodando ferramentas |
| Sala de reunião | A conversa chamou subagentes. Ela senta na cabeceira, com estrela; os subagentes nas laterais |
| `z` cochilando | Sem atividade há mais de 1 hora |
| Olheiras e suor | O contexto da conversa está grande: hora de começar uma nova |
| Papéis na mesa | Commits seus sem push no repo daquela conversa |
| Raio vermelho entre mesas | Duas conversas no mesmo repo e a branch mudou embaixo de uma delas: risco de commit na branch errada |
| Tapete com nome | Conversas do mesmo repo sentam juntas, no tapete do repo |
| Salas DEV / TST / HMG | Quem está com cada ambiente de teste do time |
| Correio | Total de commits sem push |

Em painel baixo, o escritório enche a largura e rola; um minimapa no canto mostra o escritório inteiro e leva a qualquer ponto com um clique. Os botões − + ⤢ (ou Ctrl + roda do mouse) afastam, aproximam ou mostram o escritório inteiro.

Passe o mouse numa mesa para ver a branch e o último pedido. Clique para ver o detalhe: o que você pediu, o que o Claude respondeu, os repos editados e o botão que copia o comando para retomar a conversa.

## Mais coisas que o painel faz

- **Buscar um assunto.** O campo no topo procura em todas as conversas da máquina, não só no título, sem ligar para acento ou maiúscula. As mesas que falaram do assunto acendem, e a lista inclui conversas antigas que já saíram do escritório. No chat, a skill `/conversa` faz o mesmo: "qual foi a última conversa sobre X?".
- **Quadro de avisos.** Pendências que não podem ser esquecidas ("rodar a migração antes de prod"). Marque como feito direto no painel, ou peça de qualquer conversa com a skill `/aviso`: "põe no mural: X", "marca como feito o aviso de Y".
- **Ambientes de teste.** Se o time divide dev, tst e hmg "de boca", a skill `/branches` anota quem está com cada um, e as salas mostram isso. Ela também lista o que está sem push nas suas branches.
- **Tirar do escritório.** Conversa que ficou para trás (por exemplo, aberta por outra extensão em segundo plano) sai com um clique e volta sozinha se tiver atividade nova.

## Estado ao vivo

Na entrevista, a pergunta "mostrar quando uma conversa está esperando sua aprovação?" liga o estado ao vivo: o Claude Code passa a avisar o painel a cada passo das conversas. Sem isso, o painel deduz o estado pelo histórico, com alguns segundos de atraso, e não sabe quando uma conversa espera permissão. Precisa do Node.js instalado. Dá para desligar rodando `/my-code-office` de novo.

## Configurações

| Configuração | Padrão | Para quê |
|---|---|---|
| `myCodeOffice.idioma` | `auto` | `pt-BR`, `en` ou o idioma do VS Code |
| `myCodeOffice.arranjo` | `fileiras` | `fileiras` com tapete por repo, ou `ilhas` (baias de 4) |
| `myCodeOffice.horasVisiveis` | `12` | Conversas paradas há mais tempo saem do escritório |
| `myCodeOffice.minutosCochilo` | `60` | Minutos sem atividade até cochilar |
| `myCodeOffice.tokensCansado` | `400000` | Tamanho do contexto a partir do qual aparece cansado |
| `myCodeOffice.arquivoAmbientes` | `~/.claude/branches/estado.md` | Tabela de ambientes (mantida pela `/branches`) |
| `myCodeOffice.arquivoAvisos` | `~/.claude/my-code-office/avisos.md` | Avisos do quadro, um por linha: `- [ ] texto` |

Comandos (Ctrl+Shift+P): **My Code Office: Abrir painel**, **Atualizar agora** e **Configurar**.

## Privacidade

Tudo fica na sua máquina. O painel lê os históricos do Claude Code em `~/.claude/projects` e o git dos seus repos, e não envia nada para lugar nenhum. Nunca faz push nem fetch.

## Requisitos e limites

- VS Code 1.90 ou mais novo e o Claude Code instalado.
- Node.js, só para o estado ao vivo.
- Testado no Windows.

## Desfazer

A entrevista guarda uma cópia de segurança de tudo o que altera em `~/.claude/my-code-office/backups/` e, no fim, mostra o comando para restaurar. Para sair de vez: rode `/my-code-office` e responda "não" ao estado ao vivo (isso tira os avisos do Claude Code), depois desinstale a extensão pela aba Extensões. As skills `/branches` e `/conversa` continuam funcionando sozinhas; apague as pastas delas em `~/.claude/skills/` se não quiser mais.

Para desenvolver: veja o `CONTRIBUTING.md` do repositório.
