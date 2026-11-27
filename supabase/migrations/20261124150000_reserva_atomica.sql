-- Reserva atômica: um horário de uma quadra só pode ter uma reserva ativa, e a
-- reserva provisória (em_processamento) expira em 10 minutos.
-- Spec: SPEC/2026-11-24-reserva-atomica.md

ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS expira_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.reservas_horarios (
  quadra_id TEXT NOT NULL,
  data DATE NOT NULL,
  horario TEXT NOT NULL,
  reserva_id TEXT NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  PRIMARY KEY (quadra_id, data, horario)
);

CREATE INDEX IF NOT EXISTS idx_reservas_horarios_reserva ON public.reservas_horarios (reserva_id);

-- Sem policies: o navegador não acessa esta tabela, só os triggers abaixo.
ALTER TABLE public.reservas_horarios ENABLE ROW LEVEL SECURITY;

-- Dados existentes (antes dos triggers, para não acioná-los).
UPDATE public.reservas
   SET expira_em = criada_em + INTERVAL '10 minutes'
 WHERE status = 'em_processamento' AND expira_em IS NULL;

-- Em caso de duplicata, a reserva mais antiga fica com o horário.
INSERT INTO public.reservas_horarios (quadra_id, data, horario, reserva_id)
SELECT DISTINCT ON (r.quadra_id, r.data, h.horario)
       r.quadra_id, r.data, h.horario, r.id
  FROM public.reservas r
 CROSS JOIN LATERAL unnest(r.horarios) AS h(horario)
 WHERE r.status <> 'cancelada'
 ORDER BY r.quadra_id, r.data, h.horario, r.criada_em, r.id
ON CONFLICT DO NOTHING;

-- Prazo da reserva provisória e recusa de pagamento depois do prazo.
CREATE OR REPLACE FUNCTION public.reservas_controlar_prazo_provisorio()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'em_processamento' THEN
      NEW.expira_em := NOW() + INTERVAL '10 minutes';
    ELSE
      NEW.expira_em := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'em_processamento' AND NEW.status = 'em_processamento' THEN
    NEW.expira_em := OLD.expira_em;
  ELSIF OLD.status = 'em_processamento' AND NEW.status IN ('pendente', 'confirmada') THEN
    IF OLD.expira_em IS NOT NULL AND OLD.expira_em <= NOW() THEN
      RAISE EXCEPTION 'reserva_expirada' USING ERRCODE = 'P0001';
    END IF;
    NEW.expira_em := NULL;
  ELSIF OLD.status = 'cancelada' AND NEW.status <> 'cancelada' AND OLD.expira_em IS NOT NULL THEN
    -- Provisória cancelada por expiração não volta a valer.
    RAISE EXCEPTION 'reserva_expirada' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservas_prazo_provisorio ON public.reservas;
CREATE TRIGGER trg_reservas_prazo_provisorio
  BEFORE INSERT OR UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.reservas_controlar_prazo_provisorio();

-- Ocupa e libera os horários de cada reserva.
CREATE OR REPLACE FUNCTION public.reservas_sincronizar_horarios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.quadra_id = OLD.quadra_id
     AND NEW.data = OLD.data
     AND NEW.horarios = OLD.horarios THEN
    RETURN NEW;
  END IF;

  DELETE FROM reservas_horarios WHERE reserva_id = NEW.id;

  IF NEW.status = 'cancelada' THEN
    RETURN NEW;
  END IF;

  -- Libera provisórias vencidas que ocupam algum dos horários pedidos.
  UPDATE reservas r
     SET status = 'cancelada'
   WHERE r.id <> NEW.id
     AND r.status = 'em_processamento'
     AND r.expira_em <= NOW()
     AND r.id IN (
       SELECT rh.reserva_id
         FROM reservas_horarios rh
        WHERE rh.quadra_id = NEW.quadra_id
          AND rh.data = NEW.data
          AND rh.horario = ANY (NEW.horarios)
     );

  BEGIN
    INSERT INTO reservas_horarios (quadra_id, data, horario, reserva_id)
    SELECT DISTINCT NEW.quadra_id, NEW.data, h, NEW.id
      FROM unnest(NEW.horarios) AS h;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'horario_ocupado'
      USING ERRCODE = 'P0001',
            DETAIL = format('quadra %s em %s', NEW.quadra_id, NEW.data);
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservas_horarios ON public.reservas;
CREATE TRIGGER trg_reservas_horarios
  AFTER INSERT OR UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.reservas_sincronizar_horarios();
