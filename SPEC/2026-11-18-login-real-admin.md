# Especificação: Login real do painel administrativo

## Objetivo
Substituir a autenticação simulada do painel `/admin` por autenticação real com o Supabase Auth (e-mail e senha), com a lista de administradores mantida no banco.

## Problema comprovado
- `src/hooks/useAdminAuth.ts`: a senha `admin123` está no código (`const SENHA_ADMIN = "admin123"`), que é enviado ao navegador de qualquer visitante.
- A "sessão" é a flag `localStorage.reservei_admin_auth = "true"`. Qualquer pessoa entra no painel digitando `localStorage.setItem("reservei_admin_auth", "true")` no console.
- O próprio arquivo registra a pendência: "BACKLOG: Substituir por autenticação real (JWT/OAuth)".
- A spec `SPEC/2026-09-30-admin-visao-geral.md` deixou "Autenticação real com backend" fora do escopo da AP1.

## Decisões
1. **Identidade**: Supabase Auth com e-mail e senha (`signInWithPassword`). A sessão é a do `supabase-js` (já configurado com `persistSession` e `autoRefreshToken` em `src/lib/supabase/client.ts`).
2. **Quem é administrador**: tabela `public.administradores (user_id uuid → auth.users)`. Ter uma conta no Supabase Auth **não** basta: depois do login, o app chama a função `public.is_admin()`; se ela retornar falso, a sessão é encerrada e o acesso é negado.
3. **`public.is_admin()`**: `SECURITY DEFINER`, `search_path` fixo, retorna se `auth.uid()` está em `administradores`. Será reutilizada nas policies de RLS do endurecimento de segurança.
4. **RLS de `administradores`**: habilitada; cada usuário só consegue ler o próprio registro; não há policy de escrita. Novos administradores são cadastrados pelo dono do projeto no painel do Supabase (operação de dados, não de schema), para não versionar e-mail pessoal no repositório.
5. **Mensagens de erro** em português e sem revelar se o e-mail existe: credenciais inválidas, conta sem permissão de administrador, muitas tentativas, falha de conexão e Supabase não configurado.
6. **Sem fallback de senha fixa**: se o Supabase não estiver configurado, o login do admin fica indisponível com mensagem clara.
7. **Limpeza**: ao carregar, o hook remove a flag antiga `reservei_admin_auth` do `localStorage`.
8. **Camadas**: regras e mensagens puras em `src/lib/adminAuth/`; chamadas ao Supabase em `src/lib/supabase/adminAuthService.ts`; estado em `src/hooks/useAdminAuth.ts`; tela em `AdminLogin.tsx` (novo campo de e-mail).

## Casos de borda
- Usuário autenticado que não é administrador: sessão encerrada, mensagem "Esta conta não tem acesso ao painel administrativo."
- Sessão expirada ou encerrada em outra aba: o hook escuta `onAuthStateChange` e volta para a tela de login.
- Falha ao consultar `is_admin()` (rede ou função ausente): acesso negado (falha fechada), com mensagem de conexão.
- Campos vazios ou e-mail malformado: validação antes de chamar o Supabase.
- O logout do **cliente** (`logoutUsuarioSupabase`) chama `supabase.auth.signOut()`; no mesmo navegador, isso também encerra a sessão do admin. Comportamento aceito: o painel é usado em computador do complexo.

## Banco de dados
Migração `supabase/migrations/20261118120000_administradores.sql` (idempotente): tabela, RLS, policy de leitura do próprio registro e função `is_admin()` com `EXECUTE` para `anon` e `authenticated`.

Cadastro do primeiro administrador (uma vez, pelo dono do projeto):
1. Supabase → Authentication → Users → Add user → Create new user (com "Auto Confirm User").
2. SQL Editor: `insert into public.administradores (user_id) select id from auth.users where email = '<e-mail do admin>' on conflict do nothing;`

## Fora do escopo
- Endurecimento das policies das demais tabelas com `is_admin()` (spec própria). **Até lá, os dados continuam acessíveis pela chave pública**; esta spec protege o acesso à interface do painel e cria a base para o RLS.
- Recuperação de senha do admin pelo app (feita pelo painel do Supabase).
- Vários níveis de administrador.

## Critérios de aceitação
- Não existe mais `admin123` nem a flag `reservei_admin_auth` no código.
- Com e-mail e senha de um administrador cadastrado, o painel abre; com uma conta comum ou senha errada, não abre e mostra a mensagem correta.
- Recarregar a página mantém o admin logado; "Sair" encerra a sessão.
- `/admin/reserva/[id]` continua redirecionando para o login sem sessão de admin.
- Testes cobrem mensagens de erro, validação, serviço (Supabase simulado), hook e tela de login.
