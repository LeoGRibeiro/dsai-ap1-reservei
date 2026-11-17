# Especificação: Migrações versionadas do Supabase

## Objetivo
Aplicar as mudanças de banco de dados de forma versionada e automática, em vez de copiar e colar scripts no SQL Editor do Supabase. Cada mudança de banco passa a ser revisada no PR junto com o código que depende dela, validada no CI e aplicada em produção no merge.

## Situação anterior
- Todo o banco era descrito em um único arquivo, `src/lib/supabase/schema.sql`, executado manualmente no SQL Editor.
- Não havia histórico de quais mudanças já tinham sido aplicadas, e duas pessoas editando o mesmo arquivo geravam conflitos.
- O `AGENTS.md` mandava entregar o SQL no chat para execução manual.

## Decisões
1. **Pasta de migrações**: `supabase/migrations/`, no padrão do Supabase CLI (`AAAAMMDDHHMMSS_<slug>.sql`, timestamp UTC).
2. **Migração base**: `src/lib/supabase/schema.sql` foi movido (rename no git, preservando o histórico) para `supabase/migrations/20261117000000_schema_base.sql`. Não há cópia do schema em outro lugar, para não duplicar SQL.
3. **Configuração do CLI**: `supabase/config.toml` completo, no formato gerado pelo `supabase init` (com o `project_id` do Reservei), e `supabase/.gitignore` para as pastas locais do CLI (`.branches`, `.temp`).
4. **Idempotência**: toda migração deve poder rodar de novo sem erro. A migração base já foi executada manualmente no banco novo antes deste processo existir; quando a integração aplicá-la, ela roda de novo sem efeito colateral e passa a constar no histórico de migrações do Supabase.
5. **Validação no CI** (`.github/workflows/supabase-migracoes.yml`): em PRs e pushes na `main` que alterem `supabase/**`, o job sobe um Supabase local descartável (`supabase start`), que aplica todas as migrações num banco vazio, lista as tabelas e reexecuta cada migração com `psql` para provar a idempotência. Não usa credenciais e nunca toca o banco de produção.
6. **Aplicação em produção**: pela integração GitHub do Supabase (Project Settings → Integrations → GitHub), com "Deploy to production" ligado, production branch `main` e "Supabase directory" apontando para a raiz do repositório. Nenhum segredo do banco fica no GitHub.
7. **Regras do `AGENTS.md`** atualizadas: mudança de banco = migração nova; nunca editar migração já aplicada; validação pelo CI; aplicação pela integração no merge.

## Critérios de aceitação
- Um PR que altere `supabase/**` executa o job "Migrações do Supabase" com sucesso: todas as tabelas da migração base aparecem no `\dt public.*` e a reexecução não gera erro.
- Uma migração com erro de SQL faz o job falhar no PR.
- Após o merge na `main`, a integração do Supabase aplica as migrações pendentes no projeto de produção.
- Nenhuma referência restante a `src/lib/supabase/schema.sql` no código, no `README.md`, no `AGENTS.md` e no `loop/PROMPT.md`.

## Fora do escopo
- Testes automatizados de RLS e triggers contra o banco local (podem ser adicionados nas specs que mexerem em segurança).
- Ambiente de homologação ou preview branches do Supabase.
