---
name: branches
description: {{APELIDO_DESC}}painel das branches de {{NOME}} em {{REPOS_CURTO}} — o que está sem push, divergiu, atrasou da branch principal, está parado ou pode ser limpo, e quem ocupa {{AMBIENTES_BARRA}}. Use quando {{NOME}} pedir status ou atualização das branches, "o que tenho sem push", "o que está em {{AMBIENTE_EXEMPLO}}", "o que falta subir",{{APELIDO_GATILHO}} ou ao registrar que uma branch foi para um ambiente ("subi X em {{AMBIENTE_EXEMPLO}}", "liberei {{AMBIENTE_EXEMPLO}}").
---

# /branches

{{CONTEXTO_TIME}} A skill dá visibilidade só das branches **de {{NOME}}** (commits do e-mail dela/dele no git).

## Fontes

1. `bash {{SCRIPT_COLETA}}` (pode levar até 1 min; rode com timeout de 180000).
   Linhas separadas por `|`; os cabeçalhos `#` descrevem os campos:
   - `REPO`: branch atual, arquivos modificados, data do último fetch (ou SEM REMOTO CONFIGURADO)
   - `BR`: branch ativa (≤30 dias) com commits seus fora da branch principal
   - `ANTIGA`: idem, parada há mais de 30 dias
   - `LIMPAR`: já contida na branch principal, ou `backup/*`
2. `{{ESTADO_MD}}`: quem está em cada ambiente, notas por branch, ignoradas e histórico.

{{REGRA_FETCH}}

## Relatório (padrão)

Em português, curto, nesta ordem:

1. **Ambientes**: tabela do `estado.md`. Se alguma branch está num ambiente, cruzar com o git
   (ex.: commit novo sem push → o ambiente está desatualizado).
2. **Precisa de ação**: só o que pede alguma coisa:
   - `divergiu` → o push vai exigir `--force-with-lease`; conferir se o remoto não tem commit de outra pessoa
   - `+N sem push` / `sem remoto` com trabalho de ≥1 dia
   - `atras_main` alto (>50) em branch que vai para ambiente em breve → trazer a principal antes
   - repo com arquivos modificados na branch atual
3. **Em andamento**: demais `BR`, agrupando a mesma branch em vários repos numa linha só.
   Se `em_integracao_remota` estiver preenchido, o código já está no remoto pela integration.
4. **Paradas** (`ANTIGA`): só contagem por repo e as 3 mais relevantes; listar tudo só se pedir.
5. **Limpeza**: contagem; listar só se pedir. Nunca apagar branch sem pedido explícito; para
   `backup/*`, lembrar de conferir se o conteúdo já está em outra branch.

Usar as notas do `estado.md` (card, status) para dar contexto. Branches em **Ignoradas** não
aparecem em nenhuma seção; quando pedirem para ignorar uma, registrar lá com motivo e data.

## Registrar mudanças

Quando disserem algo como "subi feature/x em {{AMBIENTE_EXEMPLO}}", "Fulano pegou {{AMBIENTE_EXEMPLO}}", "liberei {{AMBIENTE_EXEMPLO}}",
"anota que a branch y espera teste do card 12345":
- atualizar a linha do ambiente ou a nota da branch no `estado.md`, com a data de hoje
- acrescentar uma linha em **Histórico** para mudanças de ambiente
- confirmar em uma frase o que foi registrado

Ambiente sem atualização há mais de 7 dias, ou cuja branch registrada já está na principal:
avisar e perguntar o que está lá agora.

<!-- Gerado pela entrevista do My Code Office em {{DATA}}. Para mudar, rode /my-code-office de novo. -->
