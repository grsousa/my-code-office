---
name: aviso
description: Cria, lista e marca como feito avisos no quadro de avisos (mural) do My Code Office — pendências que não podem ser esquecidas e aparecem no painel do VS Code. Use quando {{NOME}} pedir "põe no mural", "anota no quadro de avisos", "cria um aviso", "me lembra de X no quadro",{{APELIDO_GATILHO_AVISO}} "o que tem no mural?", "tira do mural o aviso de X", "marca como feito o aviso de Y", ou digitar /aviso.
---

# /aviso

O quadro de avisos é o arquivo `{{AVISOS_MD}}`, um aviso por linha (`- [ ] texto` pendente,
`- [x] texto` feito). O painel do My Code Office mostra o quadro e atualiza sozinho em segundos.
Sempre mexa pelo script abaixo, nunca editando o arquivo à mão: ele evita duplicata e confere a
linha antes de marcar.

```bash
node "{{SCRIPT_AVISO}}" listar
node "{{SCRIPT_AVISO}}" novo "texto do aviso"
node "{{SCRIPT_AVISO}}" feito <número ou trecho do texto>
node "{{SCRIPT_AVISO}}" reabrir <número ou trecho do texto>
```

## Criar

- Escreva o aviso como uma ação curta e autoexplicativa, de uma linha, que faça sentido daqui
  a uma semana fora desta conversa: o quê + onde/quando. Ex.: "Rodar a migração do perfil legado
  em hmg antes de subir a tela de memórias", não "rodar aquilo".
- Use o texto que a pessoa ditou; só complete o contexto que estiver claro na conversa
  (repo, branch, ambiente, card). Se o pedido for vago ("anota isso"), resuma o ponto principal
  da conversa e mostre o texto ao confirmar.
- Vários avisos de uma vez: um `novo` por aviso.

## Marcar como feito ou reabrir

Passe um trecho que identifique o aviso (acento e maiúscula não importam) ou o número de
`listar`. Se o script disser que mais de um combina, mostre as opções e pergunte qual.

## Responder

Uma frase confirmando o que foi feito, com o texto do aviso. Para "o que tem no mural?",
liste os pendentes (e diga quantos feitos há, sem listar).

<!-- Gerado pela entrevista do My Code Office em {{DATA}}. Para mudar, rode /my-code-office de novo. -->
