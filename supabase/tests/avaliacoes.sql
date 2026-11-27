-- Testes de avaliações de clientes: quem pode avaliar, moderação e regras de acesso.
-- Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md

\set ON_ERROR_STOP on
BEGIN;

CREATE FUNCTION pg_temp.sessao(p_uid UUID) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid::text, ''), true);
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_uid IS NULL THEN '{"role":"anon"}' ELSE json_build_object('sub', p_uid, 'role', 'authenticated')::text END,
    true);
END;
$$;

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

CREATE FUNCTION pg_temp.linhas(p_sql TEXT) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE n INTEGER;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Avaliação de Ana numa reserva, para os casos de erro.
CREATE FUNCTION pg_temp.avaliar(p_id TEXT, p_reserva TEXT) RETURNS TEXT LANGUAGE sql AS $$
  SELECT format(
    $f$INSERT INTO public.avaliacoes (id, reserva_id, usuario_id, nota) VALUES (%L, %L, auth.uid()::text, 4)$f$,
    p_id, p_reserva);
$$;

GRANT EXECUTE ON FUNCTION pg_temp.sessao(UUID), pg_temp.espera_erro(TEXT, TEXT), pg_temp.linhas(TEXT),
  pg_temp.avaliar(TEXT, TEXT) TO anon, authenticated;

-- Pessoas: Ana e Bia (clientes), Caio (bloqueado), visitante anônimo (sem perfil), admin.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'ana@teste.invalid', '{}'),
  ('00000000-0000-4000-8000-0000000000b2', 'bia@teste.invalid', '{}'),
  ('00000000-0000-4000-8000-0000000000c3', 'caio@teste.invalid', '{}'),
  ('00000000-0000-4000-8000-0000000000e9', NULL, '{}'),
  ('00000000-0000-4000-8000-0000000000ad', 'admin@teste.invalid', '{}');
INSERT INTO public.administradores (user_id) VALUES ('00000000-0000-4000-8000-0000000000ad');
INSERT INTO public.usuarios (id, nome, telefone, bloqueado) VALUES
  ('00000000-0000-4000-8000-0000000000a1', '  Ana Maria   Souza ', '91900000001', FALSE),
  ('00000000-0000-4000-8000-0000000000b2', 'Bia', '91900000002', FALSE),
  ('00000000-0000-4000-8000-0000000000c3', 'Caio', '91900000003', TRUE);

-- Datas no fuso do complexo.
CREATE TEMP TABLE dia AS SELECT (now() AT TIME ZONE 'America/Belem')::date AS hoje;
GRANT SELECT ON dia TO anon, authenticated;

INSERT INTO public.reservas (id, quadra_id, nome_cliente, data, horarios, hora_inicio, hora_fim, status, tipo_reserva, user_id, criado_por)
SELECT r.id, r.quadra, 'Cliente', (SELECT hoje FROM dia) + r.dias, ARRAY['18:00', '19:00'], '18:00', '20:00',
       r.status, r.tipo, r.dono, r.criador::uuid
  FROM (VALUES
    ('r_ok',        'q1', -2,  'confirmada', 'avulsa',              '00000000-0000-4000-8000-0000000000a1', NULL),
    ('r_pendente',  'q2', -3,  'pendente',   'grupo',               '00000000-0000-4000-8000-0000000000a1', NULL),
    ('r_criada',    'q3', -1,  'confirmada', 'avulsa',              NULL, '00000000-0000-4000-8000-0000000000a1'),
    ('r_limite',    'q4', -29, 'confirmada', 'avulsa',              '00000000-0000-4000-8000-0000000000a1', NULL),
    ('r_futura',    'q1', 1,   'confirmada', 'avulsa',              '00000000-0000-4000-8000-0000000000a1', NULL),
    ('r_cancelada', 'q2', -2,  'cancelada',  'avulsa',              '00000000-0000-4000-8000-0000000000a1', NULL),
    ('r_bloqueio',  'q3', -2,  'confirmada', 'manutencao_bloqueio', '00000000-0000-4000-8000-0000000000a1', NULL),
    ('r_escolinha', 'q4', -2,  'confirmada', 'escolinha',           '00000000-0000-4000-8000-0000000000a1', NULL),
    ('r_velha',     'q1', -31, 'confirmada', 'avulsa',              '00000000-0000-4000-8000-0000000000a1', NULL),
    ('r_bia',       'q5', -2,  'confirmada', 'avulsa',              '00000000-0000-4000-8000-0000000000b2', NULL),
    ('r_caio',      'q6', -2,  'confirmada', 'avulsa',              '00000000-0000-4000-8000-0000000000c3', NULL),
    ('r_anonimo',   'q7', -2,  'confirmada', 'avulsa',              NULL, '00000000-0000-4000-8000-0000000000e9')
  ) AS r(id, quadra, dias, status, tipo, dono, criador);

-- ---------------------------------------------------------------- cliente Ana
SET LOCAL ROLE authenticated;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000a1');
DO $$
BEGIN
  -- Nasce pendente mesmo pedindo "aprovada"; comentário sem espaços nas pontas.
  INSERT INTO public.avaliacoes (id, reserva_id, usuario_id, nota, comentario, status)
  VALUES ('av_ok', 'r_ok', auth.uid()::text, 5, '  Quadra ótima!  ', 'aprovada');
  ASSERT (SELECT status FROM public.avaliacoes WHERE id = 'av_ok') = 'pendente', 'cliente não se aprova';
  ASSERT (SELECT comentario FROM public.avaliacoes WHERE id = 'av_ok') = 'Quadra ótima!', 'comentário aparado';

  -- Sinal pago (pendente), reserva criada pela sessão e no limite de 30 dias também valem.
  INSERT INTO public.avaliacoes (id, reserva_id, usuario_id, nota, comentario)
  VALUES ('av_pendente', 'r_pendente', auth.uid()::text, 3, '   ');
  ASSERT (SELECT comentario FROM public.avaliacoes WHERE id = 'av_pendente') IS NULL, 'comentário vazio vira nulo';
  EXECUTE pg_temp.avaliar('av_criada', 'r_criada');
  EXECUTE pg_temp.avaliar('av_limite', 'r_limite');

  PERFORM pg_temp.espera_erro(pg_temp.avaliar('av_dup', 'r_ok'), 'uq_avaliacoes_reserva');
  PERFORM pg_temp.espera_erro(pg_temp.avaliar('av_fut', 'r_futura'), 'avaliacao_nao_permitida');
  PERFORM pg_temp.espera_erro(pg_temp.avaliar('av_can', 'r_cancelada'), 'avaliacao_nao_permitida');
  PERFORM pg_temp.espera_erro(pg_temp.avaliar('av_blq', 'r_bloqueio'), 'avaliacao_nao_permitida');
  PERFORM pg_temp.espera_erro(pg_temp.avaliar('av_esc', 'r_escolinha'), 'avaliacao_nao_permitida');
  PERFORM pg_temp.espera_erro(pg_temp.avaliar('av_bia', 'r_bia'), 'avaliacao_nao_permitida');
  PERFORM pg_temp.espera_erro(pg_temp.avaliar('av_inex', 'r_nao_existe'), 'avaliacao_nao_permitida');
  PERFORM pg_temp.espera_erro(pg_temp.avaliar('av_velha', 'r_velha'), 'prazo_avaliacao_encerrado');
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.avaliacoes (id, reserva_id, usuario_id, nota) VALUES ('av_outro', 'r_bia', '00000000-0000-4000-8000-0000000000b2', 4)$q$,
    'row-level security');
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.avaliacoes (id, reserva_id, usuario_id, nota) VALUES ('av_n6', 'r_ok', auth.uid()::text, 6)$q$,
    'avaliacoes_nota_check');
  PERFORM pg_temp.espera_erro(
    format($q$INSERT INTO public.avaliacoes (id, reserva_id, usuario_id, nota, comentario) VALUES ('av_longo', 'r_ok', auth.uid()::text, 4, %L)$q$, repeat('a', 501)),
    'avaliacoes_comentario_check');

  -- Edita enquanto pendente; não muda a situação nem troca de reserva.
  ASSERT pg_temp.linhas($q$UPDATE public.avaliacoes SET nota = 4, comentario = 'Boa' WHERE id = 'av_ok'$q$) = 1;
  PERFORM pg_temp.espera_erro(
    $q$UPDATE public.avaliacoes SET status = 'aprovada' WHERE id = 'av_ok'$q$, 'avaliacao_travada');
  PERFORM pg_temp.espera_erro(
    $q$UPDATE public.avaliacoes SET reserva_id = 'r_limite' WHERE id = 'av_pendente'$q$, 'avaliacao_travada');

  -- Não exclui, só vê as próprias.
  ASSERT pg_temp.linhas($q$DELETE FROM public.avaliacoes WHERE id = 'av_ok'$q$) = 0, 'cliente não exclui';
  ASSERT (SELECT count(*) FROM public.avaliacoes) = 4;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- Bia, Caio (bloqueado) e visitante anônimo
SET LOCAL ROLE authenticated;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000b2');
DO $$
BEGIN
  INSERT INTO public.avaliacoes (id, reserva_id, usuario_id, nota, comentario)
  VALUES ('av_bia', 'r_bia', auth.uid()::text, 4, 'Bom atendimento');
  ASSERT (SELECT count(*) FROM public.avaliacoes) = 1, 'Bia não vê as de Ana';
  ASSERT pg_temp.linhas($q$UPDATE public.avaliacoes SET nota = 1 WHERE id = 'av_ok'$q$) = 0, 'Bia não edita a de Ana';
END $$;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000c3');
SELECT pg_temp.espera_erro(pg_temp.avaliar('av_caio', 'r_caio'), 'usuario_bloqueado');
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000e9');
SELECT pg_temp.espera_erro(pg_temp.avaliar('av_anon', 'r_anonimo'), 'avaliacao_nao_permitida');
RESET ROLE;

-- ---------------------------------------------------------------- admin modera
SET LOCAL ROLE authenticated;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000ad');
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.avaliacoes) = 5, 'admin vê todas';
  ASSERT pg_temp.linhas($q$UPDATE public.avaliacoes SET status = 'aprovada' WHERE id IN ('av_ok', 'av_bia')$q$) = 2;
  ASSERT pg_temp.linhas($q$UPDATE public.avaliacoes SET status = 'oculta' WHERE id = 'av_criada'$q$) = 1;
  ASSERT pg_temp.linhas($q$DELETE FROM public.avaliacoes WHERE id = 'av_limite'$q$) = 1;
  PERFORM pg_temp.espera_erro(
    $q$UPDATE public.avaliacoes SET status = 'publicada' WHERE id = 'av_ok'$q$, 'avaliacoes_status_check');
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- Ana: moderada fica travada
SET LOCAL ROLE authenticated;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000a1');
SELECT pg_temp.espera_erro($q$UPDATE public.avaliacoes SET nota = 1 WHERE id = 'av_ok'$q$, 'avaliacao_travada');
SELECT pg_temp.espera_erro($q$UPDATE public.avaliacoes SET nota = 5 WHERE id = 'av_criada'$q$, 'avaliacao_travada');
RESET ROLE;

-- ---------------------------------------------------------------- público
SET LOCAL ROLE anon;
SELECT pg_temp.sessao(NULL);
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.avaliacoes) = 0, 'anônimo não lê a tabela';
  ASSERT (SELECT array_agg(nome_exibicao ORDER BY nome_exibicao) FROM public.avaliacoes_publicas)
         = ARRAY['Ana S.', 'Bia'], 'só aprovadas, com nome abreviado';
  ASSERT (SELECT comentario FROM public.avaliacoes_publicas WHERE nome_exibicao = 'Ana S.') = 'Boa';
  ASSERT NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'avaliacoes_publicas' AND column_name IN ('usuario_id', 'reserva_id', 'status')
  ), 'visão pública sem dados pessoais';
  PERFORM pg_temp.espera_erro(pg_temp.avaliar('av_x', 'r_ok'), 'avaliacao_nao_permitida');
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- exclusão de conta leva as avaliações
DELETE FROM public.usuarios WHERE id = '00000000-0000-4000-8000-0000000000b2';
DO $$
BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM public.avaliacoes WHERE id = 'av_bia'), 'cascade na exclusão da conta';
END $$;

ROLLBACK;
