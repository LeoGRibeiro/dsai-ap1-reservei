#!/usr/bin/env bash
# Hook Stop: só libera se (a) escalou, ou (b) testes passam E há teste novo.
# Máximo de 3 voltas: depois disso libera (a rede de segurança do workflow escala).
set -u

# Fora do GitHub Actions (uso local) não interfere.
[ -z "${ISSUE_NUMBER:-}" ] && exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
STATE="${RUNNER_TEMP:-/tmp}/loop-voltas-${ISSUE_NUMBER}"

# 1) Escalou? Pode parar.
if gh issue view "$ISSUE_NUMBER" --json labels -q '.labels[].name' 2>/dev/null | grep -qx 'precisa-humano'; then
  exit 0
fi

# 2) Limite de voltas.
voltas=$(cat "$STATE" 2>/dev/null || echo 0)
if [ "$voltas" -ge 3 ]; then
  exit 0
fi
echo $((voltas + 1)) > "$STATE"

# 3) Existe teste novo para a issue?
git add -N tests/ 2>/dev/null
if ! git diff origin/main -- tests/ | grep -Eq '^\+\s*(it|test)\('; then
  echo "BLOQUEADO (volta $((voltas + 1))/3): não há teste novo em tests/ para esta issue. Escreva um teste que reproduza o problema, ou escale com o rótulo precisa-humano." >&2
  exit 2
fi

# 4) Testes passando?
if ! npx vitest run > "${RUNNER_TEMP:-/tmp}/vitest.log" 2>&1; then
  echo "BLOQUEADO (volta $((voltas + 1))/3): os testes estão falhando. Últimas linhas:" >&2
  tail -40 "${RUNNER_TEMP:-/tmp}/vitest.log" >&2
  exit 2
fi

exit 0
