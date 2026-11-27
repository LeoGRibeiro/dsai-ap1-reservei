-- Testes da reserva atômica. Rodam no workflow de migrações, dentro de uma
-- transação desfeita no final (nada fica no banco).
-- Spec: SPEC/2026-11-24-reserva-atomica.md

\set ON_ERROR_STOP on
BEGIN;

CREATE FUNCTION pg_temp.nova_reserva(p_id TEXT, p_quadra TEXT, p_data DATE, p_horarios TEXT[], p_status TEXT)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.reservas (id, quadra_id, data, horarios, hora_inicio, hora_fim, status)
  VALUES (p_id, p_quadra, p_data, p_horarios, p_horarios[1], p_horarios[array_length(p_horarios, 1)], p_status);
$$;

-- Vence a provisória sem esperar 10 minutos.
CREATE FUNCTION pg_temp.vencer(p_id TEXT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  ALTER TABLE public.reservas DISABLE TRIGGER trg_reservas_prazo_provisorio;
  UPDATE public.reservas SET expira_em = NOW() - INTERVAL '1 minute' WHERE id = p_id;
  ALTER TABLE public.reservas ENABLE TRIGGER trg_reservas_prazo_provisorio;
END;
$$;

CREATE FUNCTION pg_temp.espera_erro(p_sql TEXT, p_erro TEXT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'esperava o erro % em: %', p_erro, p_sql;
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> p_erro THEN
    RAISE;
  END IF;
END;
$$;

DO $$
BEGIN
  -- Mesmo horário: a segunda reserva é recusada.
  PERFORM pg_temp.nova_reserva('t_a', 'q1', '2099-01-10', ARRAY['18:00','19:00'], 'confirmada');
  PERFORM pg_temp.espera_erro(
    $q$SELECT pg_temp.nova_reserva('t_b', 'q1', '2099-01-10', ARRAY['19:00'], 'pendente')$q$,
    'horario_ocupado');
  ASSERT NOT EXISTS (SELECT 1 FROM public.reservas WHERE id = 't_b'), 'reserva recusada não pode ficar gravada';

  -- Horários encostados, outra quadra e outra data: aceitos.
  PERFORM pg_temp.nova_reserva('t_c', 'q1', '2099-01-10', ARRAY['20:00'], 'confirmada');
  PERFORM pg_temp.nova_reserva('t_d', 'q2', '2099-01-10', ARRAY['19:00'], 'confirmada');
  PERFORM pg_temp.nova_reserva('t_e', 'q1', '2099-01-11', ARRAY['19:00'], 'confirmada');

  -- Horário repetido na mesma reserva não conflita com ela mesma.
  PERFORM pg_temp.nova_reserva('t_f', 'q3', '2099-01-10', ARRAY['08:00','08:00'], 'confirmada');
  ASSERT (SELECT count(*) FROM public.reservas_horarios WHERE reserva_id = 't_f') = 1;

  -- Cancelar libera o horário.
  UPDATE public.reservas SET status = 'cancelada' WHERE id = 't_a';
  PERFORM pg_temp.nova_reserva('t_g', 'q1', '2099-01-10', ARRAY['18:00'], 'pendente');

  -- Reativar a cancelada falha porque o horário 18h já é de outra reserva.
  PERFORM pg_temp.espera_erro(
    $q$UPDATE public.reservas SET status = 'confirmada' WHERE id = 't_a'$q$,
    'horario_ocupado');

  -- Excluir libera o horário.
  DELETE FROM public.reservas WHERE id = 't_g';
  ASSERT NOT EXISTS (SELECT 1 FROM public.reservas_horarios WHERE reserva_id = 't_g');

  -- Provisória recebe prazo de 10 minutos, que o navegador não consegue estender.
  PERFORM pg_temp.nova_reserva('t_p1', 'q2', '2099-01-12', ARRAY['10:00'], 'em_processamento');
  ASSERT (SELECT expira_em BETWEEN NOW() + INTERVAL '9 minutes' AND NOW() + INTERVAL '11 minutes'
            FROM public.reservas WHERE id = 't_p1'), 'prazo da provisória deve ser 10 minutos';
  UPDATE public.reservas SET expira_em = NOW() + INTERVAL '1 day' WHERE id = 't_p1';
  ASSERT (SELECT expira_em < NOW() + INTERVAL '11 minutes' FROM public.reservas WHERE id = 't_p1'),
    'prazo não pode ser estendido';

  -- Provisória no prazo segura o horário.
  PERFORM pg_temp.espera_erro(
    $q$SELECT pg_temp.nova_reserva('t_p2', 'q2', '2099-01-12', ARRAY['10:00'], 'em_processamento')$q$,
    'horario_ocupado');

  -- Pagamento dentro do prazo confirma e limpa o prazo.
  UPDATE public.reservas SET status = 'pendente' WHERE id = 't_p1';
  ASSERT (SELECT expira_em IS NULL FROM public.reservas WHERE id = 't_p1');

  -- Provisória vencida é liberada por uma nova reserva no mesmo horário.
  PERFORM pg_temp.nova_reserva('t_p3', 'q3', '2099-01-12', ARRAY['11:00'], 'em_processamento');
  PERFORM pg_temp.vencer('t_p3');
  PERFORM pg_temp.nova_reserva('t_p4', 'q3', '2099-01-12', ARRAY['11:00'], 'confirmada');
  ASSERT (SELECT status FROM public.reservas WHERE id = 't_p3') = 'cancelada';

  -- A provisória cancelada por expiração não pode ser paga.
  PERFORM pg_temp.espera_erro(
    $q$UPDATE public.reservas SET status = 'pendente' WHERE id = 't_p3'$q$,
    'reserva_expirada');

  -- Pagamento depois do prazo é recusado.
  PERFORM pg_temp.nova_reserva('t_p5', 'q3', '2099-01-13', ARRAY['12:00'], 'em_processamento');
  PERFORM pg_temp.vencer('t_p5');
  PERFORM pg_temp.espera_erro(
    $q$UPDATE public.reservas SET status = 'confirmada' WHERE id = 't_p5'$q$,
    'reserva_expirada');

  -- Mudar de horário realoca a ocupação.
  UPDATE public.reservas SET horarios = ARRAY['21:00'], hora_inicio = '21:00', hora_fim = '21:00' WHERE id = 't_c';
  ASSERT EXISTS (SELECT 1 FROM public.reservas_horarios WHERE reserva_id = 't_c' AND horario = '21:00');
  ASSERT NOT EXISTS (SELECT 1 FROM public.reservas_horarios WHERE reserva_id = 't_c' AND horario = '20:00');

  RAISE NOTICE 'reserva_atomica: todos os testes passaram';
END;
$$;

ROLLBACK;
