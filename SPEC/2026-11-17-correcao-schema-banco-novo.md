# Especificação: Correção do schema para o banco novo da AP2

## Objetivo
Permitir que o banco de dados do Reservei seja criado do zero, em um projeto Supabase novo, executando um único script (`src/lib/supabase/schema.sql`) sem erros. O fork da AP2 não usa mais o banco da AP1.

## Problemas encontrados no script herdado
1. **Erro de sintaxe**: o bloco `DO $$` da policy de `contratos_recorrentes` não fecha o `IF` (falta `END IF;`). A execução para nesse ponto e as tabelas seguintes não são criadas.
2. **Tabela inexistente**: o script habilita RLS e cria policies na tabela `profiles`, que nunca é criada e não é usada pelo código (o app usa `usuarios`). A execução falha.
3. **Tipo incompatível em `reservas.user_id`**: a coluna é criada como `UUID REFERENCES auth.users`, mas o app grava ids de texto (`usr_<timestamp>_<sufixo>`). O insert falha e `reservasService.expurgarColunaIncompativel` remove o `user_id` do payload sem avisar. Resultado: a reserva fica sem vínculo com o cliente.
4. **Codificação corrompida** em comentários (`Usu�rios`).

## Decisões
- O script continua **idempotente**: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` e `DROP POLICY IF EXISTS` seguido de `CREATE POLICY`. Pode ser executado várias vezes.
- `reservas.user_id` passa a ser `TEXT`, sem chave estrangeira, coerente com os ids gerados pelo app.
- Todas as referências a `profiles` são removidas.
- As policies **continuam permissivas** (`USING (true)`), exatamente como na AP1. Esta spec é só de correção para o banco subir; o endurecimento de segurança (Supabase Auth, RLS por usuário e por administrador) é tratado em specs próprias.
- A publicação Realtime de `reservas` só é adicionada se ainda não existir, para o script não falhar na segunda execução.

## Critérios de aceitação
- Executar `src/lib/supabase/schema.sql` no SQL Editor de um projeto Supabase vazio termina sem erro.
- Executar o mesmo script uma segunda vez também termina sem erro.
- Uma reserva feita por um cliente logado no portal grava `user_id` com o id do cliente (verificável em Table Editor → `reservas`).
- O app em `localhost` lista quadras e horários, cria reserva, carrega o painel admin e a landing sem erros de tabela ausente no console.

## Fora do escopo
- Migrações versionadas em `supabase/migrations/` (serão adotadas a partir da próxima mudança de banco).
- Qualquer mudança de comportamento do app.
