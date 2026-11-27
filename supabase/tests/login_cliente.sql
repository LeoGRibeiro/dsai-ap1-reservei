-- Testes do perfil de cliente criado a partir do Supabase Auth. Rodam no
-- workflow de migrações, dentro de uma transação desfeita no final.
-- Spec: SPEC/2026-11-24-login-cliente-supabase-auth.md

\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  cliente UUID := '00000000-0000-4000-8000-000000000001';
  anonimo UUID := '00000000-0000-4000-8000-000000000002';
  admin   UUID := '00000000-0000-4000-8000-000000000003';
BEGIN
  ASSERT NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'senha'
  ), 'a coluna senha não pode existir';

  -- Cadastro: perfil criado com telefone vindo do e-mail, não dos metadados.
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES (cliente, '91999998888@clientes.reservei.app',
          '{"nome": "Ana", "telefone": "11111111111", "data_nascimento": "2000-05-10"}');
  ASSERT (SELECT nome FROM public.usuarios WHERE id = cliente::text) = 'Ana';
  ASSERT (SELECT telefone FROM public.usuarios WHERE id = cliente::text) = '91999998888';
  ASSERT (SELECT data_nascimento FROM public.usuarios WHERE id = cliente::text) = DATE '2000-05-10';

  -- Data de nascimento inválida não impede o cadastro.
  UPDATE auth.users SET email = '91999997777@clientes.reservei.app',
         raw_user_meta_data = '{"nome": "Ana", "data_nascimento": "10/05/2000"}'
   WHERE id = cliente;
  ASSERT (SELECT telefone FROM public.usuarios WHERE id = cliente::text) = '91999997777';
  ASSERT (SELECT data_nascimento FROM public.usuarios WHERE id = cliente::text) = DATE '2000-05-10';

  -- Visitante anônimo não tem perfil; ao virar conta (mesmo id), ganha.
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES (anonimo, NULL, '{}');
  ASSERT NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = anonimo::text);
  UPDATE auth.users SET email = '91988887777@clientes.reservei.app',
         raw_user_meta_data = '{"nome": "Bruno"}'
   WHERE id = anonimo;
  ASSERT (SELECT nome FROM public.usuarios WHERE id = anonimo::text) = 'Bruno';

  -- Admin (outro domínio) não ganha perfil de cliente.
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES (admin, 'gerente@complexo.com', '{}');
  ASSERT NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = admin::text);

  -- Excluir a própria conta apaga perfil e usuário do Auth, e só os dele.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', cliente, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', cliente::text, true);
  PERFORM public.excluir_minha_conta();
  ASSERT NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = cliente::text);
  ASSERT NOT EXISTS (SELECT 1 FROM auth.users WHERE id = cliente);
  ASSERT EXISTS (SELECT 1 FROM public.usuarios WHERE id = anonimo::text);

  RAISE NOTICE 'login_cliente: todos os testes passaram';
END;
$$;

ROLLBACK;
