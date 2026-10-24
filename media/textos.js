// Textos do My Code Office em cada idioma. Usado pelo painel (webview) e pela extensão (Node).
// Chave terminada em ".1" é a forma singular, escolhida quando n === 1. Parâmetros entre chaves: {n}.
"use strict";
(function (raiz) {
  const TEXTOS = {
    "pt-BR": {
      "estado.esperando": "Esperando você", "estado.cafe": "Resultado pronto", "estado.reuniao": "Em reunião",
      "estado.digitando": "Digitando", "estado.pensando": "Pensando", "estado.dormindo": "Parada",
      "hud.esperando": "esperando você", "hud.cafe": "resultado pronto", "hud.reuniao": "em reunião",
      "hud.trabalhando": "trabalhando", "hud.paradas": "paradas", "hud.estimado": "estimado pelos transcripts",
      "hud.estimado.dica": "Configure o estado ao vivo pela entrevista (comando My Code Office: Configurar)",
      "hud.aria": "Resumo do escritório",
      "alerta.esbarrao": "<b>Esbarrão de branch:</b> {pares} mexem no mesmo repo e a branch mudou. Mova uma delas para um worktree.",
      "alerta.par": "“{a}” (afetada) e “{b}”",
      "fila.titulo": "Fila", "fila.sub": "quem precisa de você primeiro", "fila.vazio": "Nenhuma conversa nas últimas horas.", "fila.resumo": "{n} conversas", "fila.resumo.1": "1 conversa",
      "motivo.conflito": "Mesmo repo de outra conversa, e a branch mudou", "motivo.esperando": "Esperando sua resposta",
      "motivo.reuniao": "{n} subagentes: {primeiro}", "motivo.reuniao.1": "1 subagente: {primeiro}",
      "busca.placeholder": "Buscar assunto nas conversas…", "busca.aria": "Buscar assunto em todas as conversas",
      "busca.titulo": "Busca: “{termo}”", "busca.limpar": "limpar", "busca.carregando": "Procurando em todas as conversas…",
      "busca.nada": "Nenhuma conversa falou disso.", "busca.ver": "Ver no escritório", "busca.falou": "Falou de “{termo}”.",
      "retomar": "Copiar comando para retomar",
      "dispensar": "Tirar do escritório", "dispensar.dica": "A mesa some e volta sozinha se a conversa tiver atividade nova.",
      "detalhe.viaDica.titulo": "Onde está esta conversa",
      "detalhe.viaDica": "Foi aberta pelo {via} em segundo plano, por isso não aparece na sua lista de conversas do Claude Code. Para continuar, copie o comando de retomar e cole num terminal; se já terminou, pode tirar do escritório.",
      "ambientes.titulo": "Ambientes", "editar": "editar", "semRegistro": "Sem registro",
      "avisos.titulo": "Quadro de avisos", "avisos.nada": "Nada pendente. 🎉", "avisos.resumo": "{n} pendentes", "avisos.resumo.1": "1 pendente", "ambientes.livres": "todos livres", "avisos.concluidos": "Concluídos ({n})",
      "correio.titulo": "Correio", "correio.sub": "commits seus sem push", "correio.commits": "{n} commits", "correio.commits.1": "1 commit",
      "correio.semRemoto": "sem remoto", "correio.nada": "Nada pendente.",
      "correio.ignorar": "ignorar", "correio.ignorarRepo": "ignorar o repo inteiro", "correio.repoInteiro": "repo inteiro",
      "correio.ignorarDica": "Deixa de contar no correio e no /branches. Fica em Ignoradas, no estado.md, e dá para voltar.",
      "correio.ignoradas": "Ignoradas ({n})", "correio.voltar": "voltar a contar", "correio.motivo": "sem push previsto, marcada no painel",
      "ext.ignorarFalhou": "Não consegui gravar no estado.md: {erro}",
      "campo.titulo": "Título", "campo.repo": "Repo", "campo.repos": "Repos", "campo.pasta": "Pasta", "campo.origem": "Origem",
      "campo.contexto": "Contexto", "campo.fonte": "Fonte", "detalhe.nenhumRepo": "nenhum editado ainda", "detalhe.via": "aberta pelo {via}",
      "detalhe.tokens": "{n} mil tokens", "fonte.hooks": "ao vivo", "fonte.transcript": "estimado pelo histórico",
      "detalhe.naSala": "Na sala de reunião", "detalhe.voce": "Você", "detalhe.pede": "Pede:",
      "alerta.conflito": "Outra conversa ativa mexe no mesmo repo e a branch mudou. O próximo commit pode cair na branch errada.",
      "alerta.branchMudou": "A branch de {repo} mudou desde a última edição desta conversa (antes: {antes}, agora: {agora}).",
      "alerta.semRemoto": "{repo} não tem remoto configurado: os commits existem só nesta máquina.",
      "alerta.contexto": "Contexto grande. Vale abrir uma conversa nova com um resumo.",
      "repo.em": "em", "repo.semPush": " · {n} sem push", "repo.semRemoto": ", sem remoto",
      "dica.semRepo": "Ainda não editou nenhum repo.", "dica.ultimoPedido": "Último pedido:",
      "dica.branchMudou": "{repo}: a branch mudou (ela viu {antes}).", "dica.desde": "desde {d}",
      "dica.ambienteVazio": "Sem registro. Clique para abrir a tabela de ambientes.",
      "dica.reuniao": "Reunião · {nome}", "dica.salaVazia": "Sala de reunião",
      "dica.salaVazia.texto": "Vazia. Quando uma conversa chama subagentes, eles se reúnem aqui.",
      "dica.correio": "{n} commits seus sem push nos repos que você acompanha. A lista por repo está na lateral.",
      "dica.quadro": "{n} pendentes. Marque na lateral quando fizer.", "dica.quadro.1": "1 pendente. Marque na lateral quando fizer.",
      "dica.tudoFeito": "Tudo feito!", "dica.semMesa": "Sem mesa",
      "dica.semMesa.texto": "{n} conversas a mais que as 8 mesas. Estão na fila da lateral.",
      "dica.gestor": "Gestor", "dica.gestor.texto": "Próxima fase: uma conversa que lê todas as mesas e responde “quem está livre?”.",
      "cena.quadro": "Quadro de avisos", "cena.reuniao": "Reunião", "cena.reuniaoN": "Reunião · {n} subagentes",
      "cena.reuniaoN.1": "Reunião · 1 subagente", "cena.correio": "Correio · {n}", "cena.livre": "livre?",
      "zoom.mais": "Aproximar (Ctrl + roda do mouse)", "zoom.menos": "Afastar", "zoom.inteiro": "Ver o escritório inteiro",
      "zoom.mapa": "Minimapa: clique ou arraste para ir até lá",
      "cena.semMesa": "+{n} sem mesa", "cena.gestor": "Gestor (próxima fase)", "cena.maisRepos": "+{n} repos",
      "cena.maisRepos.1": "+1 repo", "cena.semEdicao": "sem edição",
      "tarefa.questionFarm": "Pergunta do Question Farm sobre {pasta}",
      "cena.aria": "Escritório em pixel art: cada mesa é uma conversa. A fila ao lado tem o mesmo conteúdo.",
      "lado.aria": "Fila, busca e quadros",
      "ext.convite": "My Code Office: quer configurar com uma entrevista rápida no Claude Code?",
      "ext.configurarAgora": "Configurar agora", "ext.depois": "Depois",
      "ext.comoComecar": "Abra uma conversa nova no Claude Code e cole /my-code-office (já está na área de transferência). A entrevista leva uns 3 minutos e nada é gravado antes de você confirmar.",
      "ext.erroSkill": "Não consegui instalar a skill de configuração: {erro}",
      "ext.retomarCopiado": "Comando copiado. Cole num terminal para retomar a conversa.",
      "ext.avisosMudou": "O arquivo de avisos mudou. Atualizei o quadro; tente de novo.",
      "ext.arquivoNaoEncontrado": "Arquivo não encontrado: {caminho}",
      "ext.avisosIniciais": "# Quadro de avisos\n\nUm aviso por linha: \"- [ ] texto\" pendente, \"- [x] texto\" feito. Dá para marcar direto no painel.\n\n- [ ] Exemplo: rodar a migração antes de subir para prod\n",
    },
    en: {
      "estado.esperando": "Waiting for you", "estado.cafe": "Result ready", "estado.reuniao": "In a meeting",
      "estado.digitando": "Typing", "estado.pensando": "Thinking", "estado.dormindo": "Idle",
      "hud.esperando": "waiting for you", "hud.cafe": "result ready", "hud.reuniao": "in a meeting",
      "hud.trabalhando": "working", "hud.paradas": "idle", "hud.estimado": "estimated from history",
      "hud.estimado.dica": "Turn on live status in the interview (command My Code Office: Set up)",
      "hud.aria": "Office summary",
      "alerta.esbarrao": "<b>Branch collision:</b> {pares} work on the same repo and the branch changed. Move one of them to a worktree.",
      "alerta.par": "“{a}” (affected) and “{b}”",
      "fila.titulo": "Queue", "fila.sub": "who needs you first", "fila.vazio": "No conversations in the last hours.", "fila.resumo": "{n} conversations", "fila.resumo.1": "1 conversation",
      "motivo.conflito": "Same repo as another conversation, and the branch changed", "motivo.esperando": "Waiting for your answer",
      "motivo.reuniao": "{n} subagents: {primeiro}", "motivo.reuniao.1": "1 subagent: {primeiro}",
      "busca.placeholder": "Search a topic in your conversations…", "busca.aria": "Search a topic in all conversations",
      "busca.titulo": "Search: “{termo}”", "busca.limpar": "clear", "busca.carregando": "Searching all conversations…",
      "busca.nada": "No conversation talked about this.", "busca.ver": "Show in the office", "busca.falou": "Talked about “{termo}”.",
      "retomar": "Copy resume command",
      "dispensar": "Remove from office", "dispensar.dica": "The desk goes away and comes back by itself if the conversation has new activity.",
      "detalhe.viaDica.titulo": "Where is this conversation",
      "detalhe.viaDica": "It was opened by {via} in the background, so it doesn't show in your Claude Code conversation list. To continue, copy the resume command and paste it in a terminal; if it's done, you can remove it from the office.",
      "ambientes.titulo": "Environments", "editar": "edit", "semRegistro": "No record",
      "avisos.titulo": "Notice board", "avisos.nada": "Nothing pending. 🎉", "avisos.resumo": "{n} pending", "avisos.resumo.1": "1 pending", "ambientes.livres": "all free", "avisos.concluidos": "Done ({n})",
      "correio.titulo": "Mailbox", "correio.sub": "your commits not pushed", "correio.commits": "{n} commits", "correio.commits.1": "1 commit",
      "correio.semRemoto": "no remote", "correio.nada": "Nothing pending.",
      "correio.ignorar": "ignore", "correio.ignorarRepo": "ignore the whole repo", "correio.repoInteiro": "whole repo",
      "correio.ignorarDica": "Stops counting in the mailbox and in /branches. It goes to Ignored in estado.md, and you can bring it back.",
      "correio.ignoradas": "Ignored ({n})", "correio.voltar": "count again", "correio.motivo": "no push planned, marked in the panel",
      "ext.ignorarFalhou": "Couldn't write to estado.md: {erro}",
      "campo.titulo": "Title", "campo.repo": "Repo", "campo.repos": "Repos", "campo.pasta": "Folder", "campo.origem": "Source",
      "campo.contexto": "Context", "campo.fonte": "Status", "detalhe.nenhumRepo": "nothing edited yet", "detalhe.via": "opened by {via}",
      "detalhe.tokens": "{n}k tokens", "fonte.hooks": "live", "fonte.transcript": "estimated from history",
      "detalhe.naSala": "In the meeting room", "detalhe.voce": "You", "detalhe.pede": "Asks:",
      "alerta.conflito": "Another active conversation works on the same repo and the branch changed. The next commit may land on the wrong branch.",
      "alerta.branchMudou": "The branch of {repo} changed since this conversation last edited it (before: {antes}, now: {agora}).",
      "alerta.semRemoto": "{repo} has no remote: its commits exist only on this machine.",
      "alerta.contexto": "Large context. Consider starting a new conversation with a summary.",
      "repo.em": "in", "repo.semPush": " · {n} not pushed", "repo.semRemoto": ", no remote",
      "dica.semRepo": "Hasn't edited any repo yet.", "dica.ultimoPedido": "Last request:",
      "dica.branchMudou": "{repo}: the branch changed (it saw {antes}).", "dica.desde": "since {d}",
      "dica.ambienteVazio": "No record. Click to open the environments table.",
      "dica.reuniao": "Meeting · {nome}", "dica.salaVazia": "Meeting room",
      "dica.salaVazia.texto": "Empty. When a conversation calls subagents, they meet here.",
      "dica.correio": "{n} of your commits not pushed in the repos you follow. The list by repo is on the side panel.",
      "dica.quadro": "{n} pending. Check them off on the side when done.", "dica.quadro.1": "1 pending. Check it off on the side when done.",
      "dica.tudoFeito": "All done!", "dica.semMesa": "No desk",
      "dica.semMesa.texto": "{n} conversations beyond the 8 desks. They are in the side queue.",
      "dica.gestor": "Manager", "dica.gestor.texto": "Coming next: a conversation that reads every desk and answers “who is free?”.",
      "cena.quadro": "Notice board", "cena.reuniao": "Meeting", "cena.reuniaoN": "Meeting · {n} subagents",
      "cena.reuniaoN.1": "Meeting · 1 subagent", "cena.correio": "Mailbox · {n}", "cena.livre": "free?",
      "zoom.mais": "Zoom in (Ctrl + mouse wheel)", "zoom.menos": "Zoom out", "zoom.inteiro": "Show the whole office",
      "zoom.mapa": "Minimap: click or drag to go there",
      "cena.semMesa": "+{n} without a desk", "cena.gestor": "Manager (coming next)", "cena.maisRepos": "+{n} repos",
      "cena.maisRepos.1": "+1 repo", "cena.semEdicao": "no edits",
      "tarefa.questionFarm": "Question Farm question about {pasta}",
      "cena.aria": "Pixel-art office: each desk is a conversation. The side queue has the same content.",
      "lado.aria": "Queue, search and boards",
      "ext.convite": "My Code Office: set it up with a quick interview in Claude Code?",
      "ext.configurarAgora": "Set up now", "ext.depois": "Later",
      "ext.comoComecar": "Open a new Claude Code conversation and paste /my-code-office (already in your clipboard). The interview takes about 3 minutes and nothing is saved before you confirm.",
      "ext.erroSkill": "Could not install the setup skill: {erro}",
      "ext.retomarCopiado": "Command copied. Paste it in a terminal to resume the conversation.",
      "ext.avisosMudou": "The notices file changed. I refreshed the board; please try again.",
      "ext.arquivoNaoEncontrado": "File not found: {caminho}",
      "ext.avisosIniciais": "# Notice board\n\nOne notice per line: \"- [ ] text\" pending, \"- [x] text\" done. You can check them off in the panel.\n\n- [ ] Example: run the migration before going to prod\n",
    },
  };

  // "auto" segue o idioma do VS Code: português para pt-*, inglês para o resto.
  function resolverIdioma(preferido, doEditor) {
    if (TEXTOS[preferido]) return preferido;
    return String(doEditor || "").toLowerCase().startsWith("pt") ? "pt-BR" : "en";
  }

  function traduzir(idioma, chave, parametros = {}) {
    const tabela = TEXTOS[idioma] || TEXTOS["pt-BR"];
    const daForma = parametros.n === 1 && tabela[`${chave}.1`] !== undefined ? tabela[`${chave}.1`] : tabela[chave];
    const texto = daForma !== undefined ? daForma : TEXTOS["pt-BR"][chave] !== undefined ? TEXTOS["pt-BR"][chave] : chave;
    return texto.replace(/\{(\w+)\}/g, (_, nome) => (nome in parametros ? parametros[nome] : `{${nome}}`));
  }

  const api = { TEXTOS, resolverIdioma, traduzir };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else {
    const E = (raiz.Escritorio = raiz.Escritorio || {});
    E.textos = api;
    E.idioma = "pt-BR";
    E.t = (chave, parametros) => traduzir(E.idioma, chave, parametros);
  }
})(typeof window !== "undefined" ? window : globalThis);
