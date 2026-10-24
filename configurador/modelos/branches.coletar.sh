#!/usr/bin/env bash
# Coleta o estado das suas branches nos repos escolhidos na entrevista. Saída em linhas separadas por "|".
# Não faz fetch: o remoto vale até o último `git fetch` de cada repo.
# Gerado pela entrevista do My Code Office em {{DATA}}.
REPOS=( {{REPOS_BASH}} )
EU="$(git -C "${REPOS[0]}" config user.email)"
HOJE=$(date +%s)
DIAS_ATIVA=${DIAS_ATIVA:-30}   # mais velhas que isso viram ANTIGA (sem detalhe de push)

echo "# eu=$EU dias_ativa=$DIAS_ATIVA"
echo "# REPO|repo|branch_atual|arquivos_sujos|ultimo_fetch (ou SEM REMOTO CONFIGURADO|commits seus)"
echo "# BR|repo|branch|data|dias|a_frente_main|atras_main|push|em_integracao_remota"
echo "# ANTIGA|repo|branch|data|dias|a_frente_main|tem_remoto"
echo "# LIMPAR|repo|branch|motivo"
for r in "${REPOS[@]}"; do
  [ -d "$r/.git" ] || [ -f "$r/.git" ] || { echo "REPO|$(basename "$r")|?|0|PASTA NAO E UM REPO GIT"; continue; }
  nome="$(basename "$r")"
  main=$(git -C "$r" symbolic-ref -q --short refs/remotes/origin/HEAD)
  [ -z "$main" ] && for c in origin/main origin/master origin/develop; do git -C "$r" show-ref -q "refs/remotes/$c" && main=$c && break; done
  if [ -z "$main" ]; then echo "REPO|$nome|$(git -C "$r" branch --show-current)|$(git -C "$r" status --porcelain -uno | wc -l | tr -d " ")|SEM REMOTO CONFIGURADO|commits=$(git -C "$r" rev-list --count --all --author="$EU" 2>/dev/null)"; continue; fi
  fh="$r/.git/FETCH_HEAD"; fetch=$([ -f "$fh" ] && date -r "$fh" +%Y-%m-%d || echo nunca)
  echo "REPO|$nome|$(git -C "$r" branch --show-current)|$(git -C "$r" status --porcelain -uno | wc -l | tr -d ' ')|$fetch"
  remotas=" $(git -C "$r" for-each-ref refs/remotes/origin --format='%(refname:lstrip=3)' | tr '\n' ' ') "

  # Já contidas na principal e com último commit seu
  git -C "$r" for-each-ref refs/heads --merged "$main" --format='%(refname:short)|%(authoremail:trim)' \
    | awk -F'|' -v eu="$EU" -v n="$nome" -v m="${main#origin/}" '$2==eu && $1!=m {print "LIMPAR|" n "|" $1 "|ja contida na principal"}'

  git -C "$r" for-each-ref refs/heads --no-merged "$main" --format='%(refname:short)|%(committerdate:unix)' |
  while IFS='|' read b ts; do
    dias=$(( (HOJE - ts) / 86400 ))
    case "$b" in backup/*) echo "LIMPAR|$nome|$b|backup local (${dias}d)"; continue;; esac
    [ -n "$(git -C "$r" log -1 --format=%h --author="$EU" "$main..$b")" ] || continue
    read atras frente < <(git -C "$r" rev-list --left-right --count "$main...$b")
    tem=$([[ "$remotas" == *" $b "* ]] && echo sim || echo nao)
    if [ "$dias" -gt "$DIAS_ATIVA" ]; then echo "ANTIGA|$nome|$b|$(date -d @$ts +%F)|$dias|$frente|$tem"; continue; fi
    if [ "$tem" = sim ]; then
      read o l < <(git -C "$r" rev-list --left-right --count "origin/$b...$b")
      if [ "$l$o" = 00 ]; then push="em dia"
      elif [ "$o" = 0 ]; then push="+$l sem push"
      elif [ "$l" = 0 ]; then push="remoto $o a frente"
      else push="divergiu (+$l local / +$o remoto)"; fi
    else push="sem remoto"; fi
    integ=$(git -C "$r" branch -r --contains "$b" | sed 's/^ *//' | grep -E '^origin/(integration|release)/' | tr '\n' ' ')
    echo "BR|$nome|$b|$(date -d @$ts +%F)|$dias|$frente|$atras|$push|${integ:--}"
  done
done
