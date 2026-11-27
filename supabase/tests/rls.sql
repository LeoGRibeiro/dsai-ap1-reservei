-- Testes das regras de acesso (RLS). Rodam no workflow de migrações, dentro de
-- uma transação desfeita no final, trocando o papel (anon/authenticated) e o
-- usuário da sessão como o Supabase faz a cada requisição.
-- Spec: SPEC/2026-11-24-rls-por-usuario-e-admin.md

\set ON_ERROR_STOP on
BEGIN;

-- Sessão simulada: papel + usuário do JWT.
CREATE FUNCTION pg_temp.sessao(p_uid UUID) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid::text, ''), true);
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_uid IS NULL THEN '{"role":"anon"}' ELSE json_build_object('sub', p_uid, 'role', 'authenticated')::text END,
    true);
END;
$$;

-- Executa e exige erro cuja mensagem contenha o trecho esperado.
CREATE FUNCTION pg_temp.espera_erro(p_sql TEXT, p_trecho TEXT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'SEM_ERRO: esperava "%" em: %', p_trecho, p_sql;
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'SEM_ERRO:%' OR position(p_trecho IN SQLERRM) = 0 THEN
    RAISE;
  END IF;
END;
$$;

-- Quantas linhas um comando alterou.
CREATE FUNCTION pg_temp.linhas(p_sql TEXT) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE n INTEGER;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION pg_temp.sessao(UUID), pg_temp.espera_erro(TEXT, TEXT), pg_temp.linhas(TEXT)
  TO anon, authenticated;

-- Dados (como dono das tabelas, sem RLS).
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'ana@teste.invalid', '{}'),
  ('00000000-0000-4000-8000-0000000000b2', 'bia@teste.invalid', '{}'),
  ('00000000-0000-4000-8000-0000000000ad', 'admin@teste.invalid', '{}');
INSERT INTO public.administradores (user_id) VALUES ('00000000-0000-4000-8000-0000000000ad');
INSERT INTO public.usuarios (id, nome, telefone) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'Ana', '91900000001'),
  ('00000000-0000-4000-8000-0000000000b2', 'Bia', '91900000002');
INSERT INTO public.usuarios (id, nome, telefone, bloqueado) VALUES
  ('usr_bloqueado', 'Caio', '91900000003', TRUE);

INSERT INTO public.reservas (id, quadra_id, data, horarios, hora_inicio, hora_fim, status,
                             nome_cliente, whatsapp_cliente, cpf_cliente, criado_por, user_id, tipo_reserva)
VALUES
  ('r_ana', 'q1', CURRENT_DATE + 2, '{18:00}', '18:00', '19:00', 'confirmada', 'Ana', '91900000001', '11122233344',
   '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'avulsa'),
  ('r_bia', 'q2', CURRENT_DATE + 2, '{18:00}', '18:00', '19:00', 'pendente', 'Bia', '91900000002', '55566677788',
   '00000000-0000-4000-8000-0000000000b2', NULL, 'avulsa'),
  ('r_escola', 'q3', CURRENT_DATE + 2, '{08:00}', '08:00', '09:00', 'confirmada', 'Escolinha X', '91955550000', '',
   NULL, NULL, 'escolinha'),
  ('r_passada', 'q1', CURRENT_DATE - 3, '{10:00}', '10:00', '11:00', 'confirmada', 'Ana', '91900000001', '',
   '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'avulsa');
UPDATE public.reservas SET permite_vagas = TRUE, vagas_abertas = 2 WHERE id = 'r_bia';

INSERT INTO public.contratos_recorrentes (id, tipo, nome, responsavel_nome, contato_whatsapp, quadra_id, hora_inicio, hora_fim, data_inicio)
VALUES ('c_escola', 'escolinha', 'Escolinha X', 'Prof. Rui', '91955550000', 'q3', '08:00', '09:00', CURRENT_DATE),
       ('c_grupo', 'grupo', 'Pelada', 'Davi', '91944440000', 'q2', '20:00', '21:00', CURRENT_DATE);

-- ---------------------------------------------------------------- visitante sem sessão
SET LOCAL ROLE anon;
SELECT pg_temp.sessao(NULL);
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.reservas) = 0, 'anon não lê reservas';
  ASSERT (SELECT count(*) FROM public.usuarios) = 0, 'anon não lê usuários';
  ASSERT (SELECT count(*) FROM public.contratos_recorrentes) = 0, 'anon não lê contratos';

  -- Visão pública: horários sim, dados pessoais não.
  ASSERT (SELECT count(*) FROM public.reservas_publicas WHERE id IN ('r_ana', 'r_bia', 'r_escola')) = 3;
  ASSERT NOT EXISTS (SELECT 1 FROM public.reservas_publicas WHERE id = 'r_passada'), 'só a partir de ontem';
  ASSERT (SELECT nome_cliente || whatsapp_cliente FROM public.reservas_publicas WHERE id = 'r_ana') = '';
  ASSERT (SELECT whatsapp_cliente FROM public.reservas_publicas WHERE id = 'r_escola') = '91955550000',
    'contato da escolinha é público';
  ASSERT (SELECT contato_whatsapp FROM public.contratos_publicos WHERE id = 'c_grupo') = '';
  ASSERT (SELECT contato_whatsapp FROM public.contratos_publicos WHERE id = 'c_escola') = '91955550000';
  ASSERT (SELECT count(*) FROM public.reservas_horarios) >= 3, 'horários ocupados são públicos';

  ASSERT public.telefone_bloqueado('(91) 90000-0003');
  ASSERT NOT public.telefone_bloqueado('91900000001');

  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.reservas (id, quadra_id, data, horarios, hora_inicio, hora_fim, status)
       VALUES ('r_anon', 'q1', CURRENT_DATE + 5, '{10:00}', '10:00', '11:00', 'em_processamento')$q$,
    'row-level security');
  ASSERT pg_temp.linhas($q$UPDATE public.usuarios SET bloqueado = FALSE$q$) = 0;
  ASSERT pg_temp.linhas($q$DELETE FROM public.landing_page_gallery$q$) = 0;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- cliente Ana
SET LOCAL ROLE authenticated;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000a1');
DO $$
BEGIN
  ASSERT (SELECT array_agg(id ORDER BY id) FROM public.reservas) = ARRAY['r_ana', 'r_passada'], 'Ana vê só as próprias';
  ASSERT (SELECT array_agg(id) FROM public.usuarios) = ARRAY['00000000-0000-4000-8000-0000000000a1'];

  -- Não mexe na reserva da Bia.
  ASSERT pg_temp.linhas($q$UPDATE public.reservas SET status = 'cancelada' WHERE id = 'r_bia'$q$) = 0;

  -- Cria a própria provisória; não cria já paga nem como bloqueio.
  INSERT INTO public.reservas (id, quadra_id, data, horarios, hora_inicio, hora_fim, status)
  VALUES ('r_ana2', 'q1', CURRENT_DATE + 5, '{10:00}', '10:00', '11:00', 'em_processamento');
  ASSERT (SELECT criado_por FROM public.reservas WHERE id = 'r_ana2') = auth.uid();
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.reservas (id, quadra_id, data, horarios, hora_inicio, hora_fim, status)
       VALUES ('r_ana3', 'q1', CURRENT_DATE + 5, '{11:00}', '11:00', '12:00', 'confirmada')$q$,
    'row-level security');
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.reservas (id, quadra_id, data, horarios, hora_inicio, hora_fim, status, tipo_reserva)
       VALUES ('r_ana4', 'q1', CURRENT_DATE + 5, '{12:00}', '12:00', '13:00', 'em_processamento', 'manutencao_bloqueio')$q$,
    'row-level security');

  -- Checkout: valores mudam na provisória; paga; depois não muda valores nem horário.
  UPDATE public.reservas SET valor_total = 70, valor_sinal = 28, valor_pendente = 42 WHERE id = 'r_ana2';
  UPDATE public.reservas SET status = 'pendente' WHERE id = 'r_ana2';
  PERFORM pg_temp.espera_erro($q$UPDATE public.reservas SET valor_total = 1 WHERE id = 'r_ana2'$q$, 'alteracao_nao_permitida');
  PERFORM pg_temp.espera_erro($q$UPDATE public.reservas SET horarios = '{15:00}' WHERE id = 'r_ana2'$q$, 'alteracao_nao_permitida');
  PERFORM pg_temp.espera_erro($q$UPDATE public.reservas SET status = 'confirmada' WHERE id = 'r_ana2'$q$, 'alteracao_nao_permitida');

  -- Vincular a reserva a outra conta é ignorado; abrir vagas é permitido.
  UPDATE public.reservas SET user_id = '00000000-0000-4000-8000-0000000000b2', permite_vagas = TRUE, vagas_abertas = 3
   WHERE id = 'r_ana2';
  ASSERT (SELECT user_id FROM public.reservas WHERE id = 'r_ana2') IS NULL;
  ASSERT (SELECT vagas_abertas FROM public.reservas WHERE id = 'r_ana2') = 3;

  -- WhatsApp de cliente bloqueado no checkout.
  INSERT INTO public.reservas (id, quadra_id, data, horarios, hora_inicio, hora_fim, status)
  VALUES ('r_ana5', 'q2', CURRENT_DATE + 6, '{10:00}', '10:00', '11:00', 'em_processamento');
  PERFORM pg_temp.espera_erro($q$UPDATE public.reservas SET whatsapp_cliente = '91900000003' WHERE id = 'r_ana5'$q$, 'usuario_bloqueado');

  -- Cancela a própria paga; só exclui a provisória.
  UPDATE public.reservas SET status = 'cancelada' WHERE id = 'r_ana';
  ASSERT pg_temp.linhas($q$DELETE FROM public.reservas WHERE id = 'r_ana2'$q$) = 0;
  ASSERT pg_temp.linhas($q$DELETE FROM public.reservas WHERE id = 'r_ana5'$q$) = 1;

  -- Perfil: edita o nome, não o bloqueio nem o telefone.
  UPDATE public.usuarios SET nome = 'Ana Souza' WHERE id = auth.uid()::text;
  PERFORM pg_temp.espera_erro($q$UPDATE public.usuarios SET bloqueado = TRUE WHERE id = auth.uid()::text$q$, 'alteracao_nao_permitida');
  PERFORM pg_temp.espera_erro($q$UPDATE public.usuarios SET telefone = '91999999999' WHERE id = auth.uid()::text$q$, 'alteracao_nao_permitida');

  -- Interesse em vaga: na reserva da Bia (com vagas), não na própria.
  INSERT INTO public.interesses_vagas (id, reserva_id, usuario_id, nome_usuario, telefone_usuario)
  VALUES ('i_ana', 'r_bia', auth.uid()::text, 'Ana', '91900000001');
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.interesses_vagas (id, reserva_id, usuario_id) VALUES ('i_ana2', 'r_ana2', auth.uid()::text)$q$,
    'row-level security');
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.interesses_vagas (id, reserva_id, usuario_id) VALUES ('i_falso', 'r_bia', '00000000-0000-4000-8000-0000000000b2')$q$,
    'row-level security');
  ASSERT pg_temp.linhas($q$UPDATE public.interesses_vagas SET status = 'aceito' WHERE id = 'i_ana'$q$) = 0,
    'só o dono da reserva aceita';

  -- Selo só de reserva própria já jogada.
  INSERT INTO public.fidelidade_selos (id, usuario_id, reserva_id, data_jogo, expira_em)
  VALUES ('s_ok', auth.uid()::text, 'r_passada', CURRENT_DATE - 3, CURRENT_DATE + 90);
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.fidelidade_selos (id, usuario_id, reserva_id, data_jogo, expira_em)
       VALUES ('s_futuro', auth.uid()::text, 'r_ana2', CURRENT_DATE, CURRENT_DATE + 90)$q$,
    'row-level security');
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- cliente Bia (dona da reserva com vagas)
SET LOCAL ROLE authenticated;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000b2');
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.interesses_vagas WHERE reserva_id = 'r_bia') = 1, 'dona vê os interessados';
  ASSERT pg_temp.linhas($q$UPDATE public.interesses_vagas SET status = 'aceito' WHERE id = 'i_ana'$q$) = 1;
  ASSERT (SELECT count(*) FROM public.fidelidade_selos) = 0, 'não vê selos da Ana';
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- cliente bloqueado
SELECT pg_temp.sessao(NULL);
UPDATE public.usuarios SET bloqueado = TRUE WHERE id = '00000000-0000-4000-8000-0000000000b2';
SET LOCAL ROLE authenticated;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000b2');
DO $$
BEGIN
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.reservas (id, quadra_id, data, horarios, hora_inicio, hora_fim, status)
       VALUES ('r_bia2', 'q3', CURRENT_DATE + 7, '{10:00}', '10:00', '11:00', 'em_processamento')$q$,
    'usuario_bloqueado');
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- admin
SET LOCAL ROLE authenticated;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000ad');
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.reservas) >= 4, 'admin vê tudo';
  ASSERT (SELECT count(*) FROM public.usuarios) = 3;
  ASSERT (SELECT contato_whatsapp FROM public.contratos_recorrentes WHERE id = 'c_grupo') = '91944440000';
  UPDATE public.usuarios SET bloqueado = FALSE WHERE id = '00000000-0000-4000-8000-0000000000b2';
  INSERT INTO public.reservas (id, quadra_id, data, horarios, hora_inicio, hora_fim, status, tipo_reserva, nome_cliente)
  VALUES ('r_bloq', 'q3', CURRENT_DATE + 7, '{10:00}', '10:00', '11:00', 'confirmada', 'manutencao_bloqueio', 'Manutenção');
  UPDATE public.reservas SET horarios = '{11:00}', hora_inicio = '11:00', hora_fim = '12:00' WHERE id = 'r_bloq';
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- agente (MCP) com a chave pública
SET LOCAL ROLE anon;
SELECT pg_temp.sessao(NULL);
DO $$
DECLARE novo TEXT;
BEGIN
  novo := public.criar_reserva_agente('q1', CURRENT_DATE + 8, ARRAY['19:00', '18:00'], 'Rafa', '(91) 98888-7777', 'futsal');
  RESET ROLE;
  ASSERT (SELECT valor_total FROM public.reservas WHERE id = novo) = 220, 'duas horas da noite';
  ASSERT (SELECT valor_sinal FROM public.reservas WHERE id = novo) = 88;
  ASSERT (SELECT valor_pendente FROM public.reservas WHERE id = novo) = 132;
  ASSERT (SELECT status || hora_inicio || hora_fim FROM public.reservas WHERE id = novo) = 'pendente18:0020:00';
  ASSERT public.valor_hora_quadra('08:00') = 70 AND public.valor_hora_quadra('11:00') = 70;
  ASSERT public.valor_hora_quadra('12:00') = 90 AND public.valor_hora_quadra('17:00') = 90;
  ASSERT public.valor_hora_quadra('18:00') = 110 AND public.valor_hora_quadra('21:00') = 110;
  SET LOCAL ROLE anon;

  PERFORM pg_temp.espera_erro(
    $q$SELECT public.criar_reserva_agente('q1', CURRENT_DATE + 8, ARRAY['19:00'], 'Outro', '91977776666')$q$,
    'horario_ocupado');
  PERFORM pg_temp.espera_erro(
    $q$SELECT public.criar_reserva_agente('q2', CURRENT_DATE + 8, ARRAY['08:00', '10:00'], 'Rafa', '91988887777')$q$,
    'horarios_nao_consecutivos');
  PERFORM pg_temp.espera_erro(
    $q$SELECT public.criar_reserva_agente('q2', CURRENT_DATE + 8, ARRAY['22:00'], 'Rafa', '91988887777')$q$,
    'horario_invalido');
  PERFORM pg_temp.espera_erro(
    $q$SELECT public.criar_reserva_agente('q2', CURRENT_DATE + 8, ARRAY['10:00'], 'Caio', '91900000003')$q$,
    'usuario_bloqueado');
  PERFORM pg_temp.espera_erro(
    $q$SELECT public.criar_reserva_agente('q2', CURRENT_DATE - 1, ARRAY['10:00'], 'Rafa', '91988887777')$q$,
    'dados_invalidos');
END $$;
RESET ROLE;

DO $$ BEGIN RAISE NOTICE 'rls: todos os testes passaram'; END $$;
ROLLBACK;
