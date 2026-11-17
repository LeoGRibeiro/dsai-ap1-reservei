# Especificação: Fundação de qualidade da AP2

## Objetivo
Criar a base que permite evoluir o Reservei com segurança e medir a qualidade de forma automática: integração contínua, cobertura de testes, lint sem erros, dependências sem alertas críticos, nenhuma credencial no código e regras de trabalho atualizadas para a AP2.

## Problemas comprovados
1. **Sem CI de qualidade**: o único workflow (`.github/workflows/loop.yml`) é o loop de issues; nada roda lint, typecheck, testes ou build em PRs.
2. **Lint com 28 erros** (`npm run lint`):
   - 19 `react-hooks/set-state-in-effect` em componentes herdados;
   - 6 `react/no-unescaped-entities` (aspas em JSX);
   - 1 `react-hooks/immutability`: `FormularioIdentificacao.tsx` altera o objeto de estado `dados` diretamente (`dados.nome = user.nome`);
   - 2 `react-hooks/preserve-manual-memoization` (`PortalCliente.tsx`, `useFidelidadeService.ts`): dependências do `useCallback` diferentes das inferidas.
3. **Cobertura não medida**: `@vitest/coverage-v8` não está instalado. Linha de base medida nesta spec: **31% de linhas**.
4. **Dependência com alerta crítico**: `next@16.3.7` (corrigido em `16.4.6`). Além disso, `shadcn` (CLI de geração de componentes) estava em `dependencies` e trazia 17 alertas para o pacote de produção sem ser usado em tempo de execução.
5. **Credencial embutida no MCP**: `mcp_server/reservei_mcp/server.py` tinha URL e anon key do Supabase dos autores originais como valor padrão. Sem variáveis de ambiente, o MCP gravava no banco dos autores.
6. **MCP incompatível com a chave nova**: a publishable key (`sb_publishable_...`) era enviada também no cabeçalho `Authorization: Bearer`, que só aceita JWT.
7. **MCP informava sucesso falso**: `salvar_reserva_supabase` retornava `True` mesmo quando o Supabase recusava a gravação, e o agente dizia ao usuário que a reserva estava confirmada. Avisos eram impressos no stdout, que é o canal JSON-RPC do protocolo.
8. **Regras de trabalho desatualizadas**: o `AGENTS.md` mandava gerar linhas de código "organicamente" (meta de 100 mil LOC da AP1) e nunca omitir código, o que conflita com a meta de duplicação abaixo de 5% da AP2.
9. **Teste dependente do relógio**: `tests/components/portal/HorarioGrid.test.tsx` usa uma data fixa; quando o dia real passa dessa data, os horários viram "expirados" e o teste quebra.

## Decisões
1. **CI** (`.github/workflows/ci.yml`), em PRs e pushes na `main`, com três jobs:
   - `app`: `npm ci`, lint, typecheck, testes com cobertura, build e, em PR, **diff coverage mínimo de 70%** com `diff-cover` sobre o lcov.
   - `mcp`: `pytest` dos testes Python.
   - `segredos`: gitleaks sobre todo o histórico, com `.gitleaks.toml`.
2. **Lint**: corrigir os 9 erros que apontam defeito ou risco real (aspas, mutação de estado, dependências de memoização). A regra `react-hooks/set-state-in-effect` passa a **aviso**, com justificativa no `eslint.config.mjs`: os 19 casos são efeitos de carga e de reset de formulários em componentes sem testes de tela, e reescrevê-los agora seria arriscado. Código novo deve evitar o padrão; os casos existentes são corrigidos quando o componente for alterado.
3. **Cobertura**: `@vitest/coverage-v8` na mesma versão do Vitest, relatórios `text-summary`, `lcov` e `json-summary`, script `test:coverage`. `testTimeout` de 15s: com a instrumentação, um teste de tela passava do limite padrão de 5s.
4. **lcov na raiz**: o Vitest roda em `src/` e grava caminhos relativos a `src/`. O script `scripts/ci/normalizar-lcov.mjs` prefixa `src/` para o `diff-cover` casar os arquivos com o `git diff`.
5. **Dependências**: `next` e `eslint-config-next` para `16.4.6`; `shadcn` movido para `devDependencies`. Não usar `npm audit fix` em massa: ele atualizou o `undici` do jsdom para uma versão que exige Node mais novo e quebrou todos os testes. Os alertas restantes ficam só em dependências de desenvolvimento, sem nenhum crítico.
6. **MCP**: sem URL nem chave no código; credenciais só por variável de ambiente (aceita os nomes do app Next.js e a publishable key). Sem variáveis, modo local em memória. `Authorization` só para chave JWT. Falha de gravação com Supabase configurado retorna `False`. Avisos vão para o stderr.
7. **Gitleaks**: exceção restrita, por commit, para os 2 commits da AP1 que contêm as chaves públicas do projeto Supabase dos autores originais (o histórico não pode ser reescrito). Qualquer ocorrência nova é detectada.
8. **AGENTS.md**: remove a meta de LOC e a regra de nunca omitir código; registra as regras da AP2 (spec antes do código, trailers, sessões, testes, duplicação, CI e PR, segredos).
9. **HorarioGrid**: congelar apenas o `Date` no teste (`vi.useFakeTimers({ toFake: ["Date"] })`) na manhã da data fixa.

## Critérios de aceitação
- `npm run lint` sem erros; `npm run typecheck` sem erros; `npm test` e `npm run test:coverage` passando.
- `npm audit --omit=dev` sem alertas críticos.
- Nenhuma ocorrência da URL ou da chave antigas em `mcp_server/`.
- `pytest tests` passando, incluindo os testes de credenciais e de falha de gravação do MCP.
- Workflow `CI` verde no PR desta spec.
- Em PR, o job `app` falha se a cobertura das linhas novas ficar abaixo de 70%.

## Fora do escopo
- Corrigir os 19 avisos de `set-state-in-effect` e os demais avisos de lint.
- Medição de duplicação (`jscpd`) no CI.
- Proteção da branch `main` no GitHub (configurada manualmente em Settings → Branches: exigir PR com 1 aprovação e o CI verde).
- Hospedagem pública (registrada no `BACKLOG.md`).
