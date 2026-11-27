-- Testes de eventos e torneios: regras de inscrição e regras de acesso.
-- Spec: SPEC/2026-11-27-eventos-e-torneios.md

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

GRANT EXECUTE ON FUNCTION pg_temp.sessao(UUID), pg_temp.espera_erro(TEXT, TEXT), pg_temp.linhas(TEXT)
  TO anon, authenticated;

-- Pessoas: Ana e Bia (clientes), Caio (bloqueado), visitante anônimo (sem perfil), admin.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'ana@teste.invalid', '{}'),
  ('00000000-0000-4000-8000-0000000000b2', 'bia@teste.invalid', '{}'),
  ('00000000-0000-4000-8000-0000000000c3', 'caio@teste.invalid', '{}'),
  ('00000000-0000-4000-8000-0000000000e9', NULL, '{}'),
  ('00000000-0000-4000-8000-0000000000ad', 'admin@teste.invalid', '{}');
INSERT INTO public.administradores (user_id) VALUES ('00000000-0000-4000-8000-0000000000ad');
INSERT INTO public.usuarios (id, nome, telefone, bloqueado) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'Ana', '91900000001', FALSE),
  ('00000000-0000-4000-8000-0000000000b2', 'Bia', '91900000002', FALSE),
  ('00000000-0000-4000-8000-0000000000c3', 'Caio', '91900000003', TRUE),
  ('u1', 'U1', '91910000001', FALSE), ('u2', 'U2', '91910000002', FALSE),
  ('u3', 'U3', '91910000003', FALSE), ('u4', 'U4', '91910000004', FALSE);

INSERT INTO public.eventos (id, tipo, nome, data, hora_inicio, hora_fim, max_times, inscricoes_ate, status) VALUES
  ('e_aberto',   'torneio', 'Copa Aberta', CURRENT_DATE + 5, '18:00', '22:00', 4, CURRENT_DATE + 3, 'publicado'),
  ('e_prazo',    'torneio', 'Copa Prazo',  CURRENT_DATE + 5, '18:00', '22:00', 4, CURRENT_DATE - 1, 'publicado'),
  ('e_cheio',    'torneio', 'Copa Cheia',  CURRENT_DATE + 5, '18:00', '22:00', 4, NULL, 'publicado'),
  ('e_rascunho', 'torneio', 'Copa Secreta', CURRENT_DATE + 5, '18:00', '22:00', 4, NULL, 'rascunho'),
  ('e_social',   'social',  'Festa',       CURRENT_DATE + 5, '18:00', '22:00', NULL, NULL, 'publicado');

INSERT INTO public.eventos_inscricoes (id, evento_id, usuario_id, nome_time, responsavel_whatsapp) VALUES
  ('i1', 'e_cheio', 'u1', 'Time 1', '91910000001'), ('i2', 'e_cheio', 'u2', 'Time 2', '91910000002'),
  ('i3', 'e_cheio', 'u3', 'Time 3', '91910000003'), ('i4', 'e_cheio', 'u4', 'Time 4', '91910000004');
UPDATE public.eventos_inscricoes SET confirmada = TRUE WHERE id IN ('i1', 'i2');

-- ---------------------------------------------------------------- visitante sem sessão
SET LOCAL ROLE anon;
SELECT pg_temp.sessao(NULL);
DO $$
BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM public.eventos WHERE id = 'e_rascunho'), 'rascunho não é público';
  ASSERT EXISTS (SELECT 1 FROM public.eventos WHERE id = 'e_aberto');
  ASSERT (SELECT count(*) FROM public.eventos_inscricoes) = 0, 'inscrições têm WhatsApp';
  ASSERT (SELECT array_agg(nome_time ORDER BY nome_time) FROM public.eventos_times_publicos WHERE evento_id = 'e_cheio')
         = ARRAY['Time 1', 'Time 2'], 'só times confirmados';
  ASSERT NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'eventos_times_publicos' AND column_name = 'responsavel_whatsapp'
  );
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- cliente Ana
SET LOCAL ROLE authenticated;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000a1');
DO $$
BEGIN
  INSERT INTO public.eventos_inscricoes (id, evento_id, usuario_id, nome_time, responsavel_whatsapp)
  VALUES ('ia', 'e_aberto', auth.uid()::text, '  Leões FC  ', '91900000001');
  ASSERT (SELECT nome_time FROM public.eventos_inscricoes WHERE id = 'ia') = 'Leões FC', 'nome sem espaços nas pontas';

  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.eventos_inscricoes (id, evento_id, usuario_id, nome_time) VALUES ('ia2', 'e_aberto', auth.uid()::text, 'Outro Time')$q$,
    'uq_eventos_inscricoes_usuario');
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.eventos_inscricoes (id, evento_id, usuario_id, nome_time) VALUES ('ia3', 'e_prazo', auth.uid()::text, 'Leões FC')$q$,
    'inscricoes_encerradas');
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.eventos_inscricoes (id, evento_id, usuario_id, nome_time) VALUES ('ia4', 'e_cheio', auth.uid()::text, 'Leões FC')$q$,
    'vagas_esgotadas');
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.eventos_inscricoes (id, evento_id, usuario_id, nome_time) VALUES ('ia5', 'e_social', auth.uid()::text, 'Leões FC')$q$,
    'inscricoes_encerradas');
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.eventos_inscricoes (id, evento_id, usuario_id, nome_time) VALUES ('ia6', 'e_rascunho', auth.uid()::text, 'Leões FC')$q$,
    'inscricoes_encerradas');
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.eventos_inscricoes (id, evento_id, usuario_id, nome_time) VALUES ('ia7', 'e_aberto', 'u1', 'Time do U1')$q$,
    'row-level security');

  -- Não se confirma sozinha, não vê inscrições dos outros, não mexe na chave.
  ASSERT pg_temp.linhas($q$UPDATE public.eventos_inscricoes SET confirmada = TRUE WHERE id = 'ia'$q$) = 0;
  ASSERT (SELECT count(*) FROM public.eventos_inscricoes) = 1;
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.eventos_partidas (id, evento_id, rodada, posicao) VALUES ('p1', 'e_aberto', 1, 0)$q$,
    'row-level security');
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- Bia: nome repetido (outra caixa)
SET LOCAL ROLE authenticated;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000b2');
DO $$
BEGIN
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.eventos_inscricoes (id, evento_id, usuario_id, nome_time) VALUES ('ib', 'e_aberto', auth.uid()::text, 'LEÕES fc')$q$,
    'uq_eventos_inscricoes_nome_time');
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.eventos_inscricoes (id, evento_id, usuario_id, nome_time, confirmada) VALUES ('ib0', 'e_aberto', auth.uid()::text, 'Tigres', TRUE)$q$,
    'row-level security');
  INSERT INTO public.eventos_inscricoes (id, evento_id, usuario_id, nome_time) VALUES ('ib', 'e_aberto', auth.uid()::text, 'Tigres');
  -- Desiste enquanto o evento está publicado.
  ASSERT pg_temp.linhas($q$DELETE FROM public.eventos_inscricoes WHERE id = 'ib'$q$) = 1;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- bloqueado e visitante anônimo
SET LOCAL ROLE authenticated;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000c3');
DO $$
BEGIN
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.eventos_inscricoes (id, evento_id, usuario_id, nome_time) VALUES ('ic', 'e_aberto', auth.uid()::text, 'Time Caio')$q$,
    'usuario_bloqueado');
END $$;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000e9');
DO $$
BEGIN
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.eventos_inscricoes (id, evento_id, usuario_id, nome_time) VALUES ('ie', 'e_aberto', auth.uid()::text, 'Time Anon')$q$,
    'conta_necessaria');
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- admin
SET LOCAL ROLE authenticated;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000ad');
DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM public.eventos WHERE id = 'e_rascunho'), 'admin vê rascunho';
  ASSERT pg_temp.linhas($q$UPDATE public.eventos_inscricoes SET confirmada = TRUE WHERE id = 'ia'$q$) = 1;
  INSERT INTO public.eventos_partidas (id, evento_id, rodada, posicao, inscricao_a) VALUES ('p1', 'e_aberto', 1, 0, 'ia');
  UPDATE public.eventos SET status = 'chave_sorteada' WHERE id = 'e_aberto';
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- depois do sorteio
SET LOCAL ROLE authenticated;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000a1');
DO $$
BEGIN
  ASSERT pg_temp.linhas($q$DELETE FROM public.eventos_inscricoes WHERE id = 'ia'$q$) = 0, 'não desiste depois do sorteio';
END $$;
SELECT pg_temp.sessao('00000000-0000-4000-8000-0000000000b2');
DO $$
BEGIN
  PERFORM pg_temp.espera_erro(
    $q$INSERT INTO public.eventos_inscricoes (id, evento_id, usuario_id, nome_time) VALUES ('ib2', 'e_aberto', auth.uid()::text, 'Tigres')$q$,
    'inscricoes_encerradas');
END $$;
RESET ROLE;

DO $$ BEGIN RAISE NOTICE 'eventos: todos os testes passaram'; END $$;
ROLLBACK;
