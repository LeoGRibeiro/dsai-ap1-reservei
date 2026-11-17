# Especificação: Pipeline de migrações do Supabase

## Objetivo
Aplicar as mudanças de banco de dados de forma versionada e automática, pelo GitHub Actions, em vez de copiar e colar scripts no SQL Editor do Supabase. Cada mudança de banco passa a ser revisada no PR junto com o código que depende dela.

## Situação anterior
- Todo o banco era descrito em um único arquivo, `src/lib/supabase/schema.sql`, executado manualmente no SQL Editor.
- Não havia histórico de quais mudanças já tinham sido aplicadas, e duas pessoas editando o mesmo arquivo geravam conflitos.
- O `AGENTS.md` mandava entregar o SQL no chat para execução manual.

## Decisões
1. **Pasta de migrações**: `supabase/migrations/`, no padrão do Supabase CLI (`AAAAMMDDHHMMSS_<slug>.sql`, timestamp UTC).
2. **Migração base**: `src/lib/supabase/schema.sql` foi movido (com `git mv`, preservando o histórico) para `supabase/migrations/20261117000000_schema_base.sql`. Não há cópia do schema em outro lugar, para não duplicar SQL.
3. **Idempotência**: toda migração deve poder rodar de novo sem erro. Isso é importante porque a migração base já foi executada manualmente no banco novo antes do pipeline existir; na primeira execução do pipeline ela roda de novo sem efeito colateral e passa a constar no histórico de migrações do Supabase.
4. **Workflow** `.github/workflows/supabase-migracoes.yml`:
   - Dispara em PRs e em push na `main` que alterem `supabase/**` (ou o próprio workflow), e manualmente (`workflow_dispatch`).
   - Em PR: `supabase link` + `supabase migration list` + `supabase db push --dry-run --include-all` (valida sem aplicar).
   - Em push na `main`: `supabase db push --include-all` (aplica as pendentes).
   - `--include-all` permite aplicar migrações de branches paralelas cujo timestamp seja anterior à última migração já aplicada.
   - `concurrency` sem cancelamento, para nunca haver duas aplicações ao mesmo tempo.
   - Sem os secrets configurados, o job emite um aviso e termina sem falhar.
5. **Secrets** do repositório: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`. Nenhuma credencial fica no código.
6. **Configuração mínima** do CLI em `supabase/config.toml`; arquivos temporários do CLI (`supabase/.temp`, `supabase/.branches`) ficam no `.gitignore`.
7. **Regras do `AGENTS.md`** atualizadas: mudança de banco = migração nova; nunca editar migração já aplicada; aplicação pelo pipeline.

## Critérios de aceitação
- Com os secrets configurados, um PR que altere `supabase/**` executa o dry-run com sucesso.
- Após o merge na `main`, o job aplica as migrações e `supabase migration list` mostra a migração base como aplicada no remoto.
- Sem secrets, o workflow termina com aviso, sem falhar.
- Nenhuma referência restante a `src/lib/supabase/schema.sql` no código, no `README.md`, no `AGENTS.md` e no `loop/PROMPT.md`.

## Fora do escopo
- Banco local com Docker (`supabase start`) e testes de banco no CI.
- Ambiente de homologação separado.
