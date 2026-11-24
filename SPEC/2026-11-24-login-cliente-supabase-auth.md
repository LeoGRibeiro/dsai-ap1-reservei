# Especificação: Login do cliente com Supabase Auth

## Objetivo
Concluir a autenticação do cliente prevista pelos autores em `SPEC/2026-10-01-sistema-usuarios.md` ("Supabase Auth via Telefone e Senha [...] sem exigir e-mail e sem gerar custos com SMS"), que nunca foi implementada: hoje a senha fica em texto puro numa tabela pública e a sessão é um objeto no `localStorage`.

## Problemas comprovados
1. **Senha em texto puro e legível por qualquer visitante**: `usuarios.senha` (`supabase/migrations/20261117000000_schema_base.sql`) com policy de leitura pública. O login é uma consulta `.eq("telefone", digits).eq("senha", senha)` feita no navegador (`src/lib/supabase/authService.ts`, `loginUsuarioSupabase`).
2. **Sessão falsificável**: `obterUsuarioAtual` confia no JSON salvo em `localStorage["reservei_current_user"]`. Basta gravar `{"id": "<id de outro cliente>"}` para "entrar" na conta dele.
3. **Spec dos autores não cumprida**: a spec de usuários pede Supabase Auth; o código não usa o Supabase Auth para o cliente.

## Decisões
1. **Login continua sendo WhatsApp e senha**, como na spec dos autores. O Supabase Auth recebe um e-mail interno derivado do número: `<dígitos>@clientes.reservei.app` (ex.: `91999998888@clientes.reservei.app`). O cliente nunca vê esse e-mail. Motivo: o login por telefone do Supabase exige configurar um provedor de SMS mesmo com a confirmação desligada; o e-mail interno cumpre a regra sem custo.
   - Configuração no painel do Supabase (feita pelo Alexsandro): Email com **"Confirm email" desligado**.
   - O domínio fica numa constante única (`DOMINIO_LOGIN_CLIENTE`) e é repetido na migração.
2. **Perfil criado pelo banco**: trigger em `auth.users` cria ou atualiza a linha de `public.usuarios` quando aparece um e-mail com o domínio de clientes. O telefone gravado vem da parte local do e-mail (não do que o navegador mandar), então o perfil sempre corresponde ao login. Nome e data de nascimento vêm dos metadados do cadastro. Contas de admin e anônimas não ganham perfil.
3. **Fim da senha em texto puro**: a coluna `usuarios.senha` é removida. As contas antigas (sem usuário correspondente no Auth) são apagadas de `usuarios`: o banco é novo e só tem dados de teste; quem tiver conta se cadastra de novo. Reservas antigas não são apagadas.
4. **Visitante sem conta usa login anônimo do Supabase** (configuração no painel: **"Allow anonymous sign-ins" ligado**). A sessão anônima é criada só quando o visitante começa uma reserva. Ela prepara a etapa de RLS, em que cada um só altera as próprias reservas.
   - Visitante com sessão anônima que cria conta depois da reserva (`ModalPosReservaCadastro`): a conta anônima é **convertida** (mesmo id), em vez de criar outra.
   - Sessão anônima não conta como cliente logado (`isAutenticado` continua `false`).
5. **Sessão**: passa a ser a do Supabase Auth (JWT renovado pelo próprio cliente do Supabase). O `localStorage["reservei_current_user"]` vira só cache de exibição, para a tela não piscar; ele nunca é usado para decidir quem está logado e é descartado quando não há sessão válida.
6. **Excluir conta (LGPD)**: função `excluir_minha_conta()` (`SECURITY DEFINER`) apaga o perfil e o usuário do Auth da própria sessão. Hoje só a linha de `usuarios` é apagada.
7. **Sem Supabase configurado**: cadastro e login mostram "indisponível neste ambiente", como no login do admin. O modo local com usuários e senhas no `localStorage` deixa de ser usado para login.
8. **Interface preservada**: `useUserAuth` e as funções exportadas por `authService.ts` mantêm nomes e assinaturas, para não alterar as 11 telas que as usam.
9. **Regras puras** em `src/lib/clienteAuth/regras.ts`: e-mail interno a partir do telefone, validação do telefone e tradução dos erros do Supabase Auth (WhatsApp já cadastrado, credenciais erradas, muitas tentativas, falha de conexão).

## Casos de borda
- Telefone com máscara, espaços ou DDI digitado: só os dígitos formam o e-mail; menos de 10 dígitos é recusado antes de chamar o Supabase.
- Cadastro com WhatsApp já usado: "Este número de WhatsApp já possui uma conta cadastrada."
- Login com senha errada ou WhatsApp sem conta: a mesma mensagem ("WhatsApp ou senha incorretos."), sem revelar se o número tem conta.
- Cliente bloqueado continua conseguindo entrar (o bloqueio impede novas reservas, como na spec de bloqueio dos autores).
- Sessão expirada ou removida em outra aba: o cache de exibição é limpo e o cliente aparece deslogado.
- Admin logado no mesmo navegador: não ganha perfil de cliente nem sessão anônima.
- Recuperação de senha: segue a regra dos autores (o cliente pede ao admin pelo WhatsApp). A troca de senha pelo admin exige a chave de serviço do Supabase e fica no `BACKLOG.md`.

## Mudanças no banco
Migração `supabase/migrations/20261124170000_login_cliente_supabase_auth.sql`:
- remove `usuarios.senha` e os perfis sem usuário no Auth;
- função e trigger de criação de perfil em `auth.users`;
- função `excluir_minha_conta()` com `EXECUTE` só para `authenticated`;
- `supabase/config.toml`: `enable_anonymous_sign_ins = true` (ambiente local e CI).

As policies continuam permissivas nesta etapa; o endurecimento é a spec de RLS.

## Testes
- SQL (`supabase/tests/login_cliente.sql`): perfil criado no cadastro, telefone vindo do e-mail, conversão da conta anônima, admin e anônimo sem perfil, `excluir_minha_conta` apagando perfil e usuário.
- Vitest: regras puras; `authService` com Supabase simulado (cadastro novo, conversão da anônima, WhatsApp duplicado, login, sessão anônima tratada como deslogado, cache falsificado ignorado, logout, exclusão); criação da sessão anônima antes da reserva.

## Critérios de aceitação
- Nenhuma senha em `public.usuarios`; nenhum código lê ou grava senha fora do Supabase Auth.
- Gravar um perfil qualquer em `localStorage["reservei_current_user"]` não dá acesso à conta.
- Cadastro, login, logout, edição de perfil e exclusão de conta funcionando com o Supabase Auth.
- CI verde, com cobertura das linhas novas acima de 70%.

## Fora do escopo
- Policies de RLS por usuário e por admin (próxima spec).
- Troca de senha pelo admin e "esqueci minha senha".
