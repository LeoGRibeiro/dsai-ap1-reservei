-- Avaliações de clientes: quem jogou avalia a reserva, o admin modera e a landing
-- mostra as aprovadas.
-- Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md

CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id TEXT PRIMARY KEY,
  reserva_id TEXT NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nota INTEGER NOT NULL CONSTRAINT avaliacoes_nota_check CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT CONSTRAINT avaliacoes_comentario_check CHECK (char_length(comentario) <= 500),
  status TEXT NOT NULL DEFAULT 'pendente'
    CONSTRAINT avaliacoes_status_check CHECK (status IN ('pendente', 'aprovada', 'oculta')),
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_avaliacoes_reserva ON public.avaliacoes (reserva_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_usuario ON public.avaliacoes (usuario_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_status ON public.avaliacoes (status, criada_em DESC);

-- Quem pode avaliar e o que o cliente pode mudar. O admin só modera.
CREATE OR REPLACE FUNCTION public.avaliacoes_validar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  fim TIMESTAMPTZ;
BEGIN
  NEW.comentario := NULLIF(trim(NEW.comentario), '');
  NEW.atualizada_em := NOW();

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'pendente'
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.reserva_id IS DISTINCT FROM OLD.reserva_id
       OR NEW.usuario_id IS DISTINCT FROM OLD.usuario_id THEN
      RAISE EXCEPTION 'avaliacao_travada' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  NEW.status := 'pendente';

  SELECT * INTO r FROM reservas WHERE id = NEW.reserva_id;
  IF NOT FOUND
     OR NOT EXISTS (SELECT 1 FROM usuarios WHERE id = NEW.usuario_id)
     OR NOT (r.user_id IS NOT DISTINCT FROM NEW.usuario_id OR r.criado_por::text IS NOT DISTINCT FROM NEW.usuario_id)
     OR r.status NOT IN ('pendente', 'confirmada')
     OR COALESCE(r.tipo_reserva, 'avulsa') NOT IN ('avulsa', 'grupo', 'admin_manual') THEN
    RAISE EXCEPTION 'avaliacao_nao_permitida' USING ERRCODE = 'P0001';
  END IF;

  fim := (r.data + r.hora_fim::time) AT TIME ZONE 'America/Belem';
  IF fim > NOW() THEN
    RAISE EXCEPTION 'avaliacao_nao_permitida' USING ERRCODE = 'P0001';
  END IF;
  IF fim + INTERVAL '30 days' < NOW() THEN
    RAISE EXCEPTION 'prazo_avaliacao_encerrado' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM usuarios WHERE id = NEW.usuario_id AND bloqueado) THEN
    RAISE EXCEPTION 'usuario_bloqueado' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_avaliacoes_validar ON public.avaliacoes;
CREATE TRIGGER trg_avaliacoes_validar
  BEFORE INSERT OR UPDATE ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.avaliacoes_validar();

-- Aprovadas, com o nome abreviado ("Ana S.") e sem dados pessoais.
CREATE OR REPLACE VIEW public.avaliacoes_publicas AS
SELECT a.id,
       a.nota,
       a.comentario,
       CASE
         WHEN array_length(p.partes, 1) > 1
           THEN p.partes[1] || ' ' || upper(left(p.partes[array_length(p.partes, 1)], 1)) || '.'
         ELSE COALESCE(p.partes[1], 'Cliente')
       END AS nome_exibicao,
       a.criada_em
  FROM public.avaliacoes a
  JOIN public.usuarios u ON u.id = a.usuario_id
  CROSS JOIN LATERAL (
    SELECT string_to_array(NULLIF(regexp_replace(trim(u.nome), '\s+', ' ', 'g'), ''), ' ') AS partes
  ) p
 WHERE a.status = 'aprovada';

GRANT SELECT ON public.avaliacoes_publicas TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- Regras de acesso
-- ------------------------------------------------------------------------------
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Avaliações: dono ou admin lê" ON public.avaliacoes;
CREATE POLICY "Avaliações: dono ou admin lê"
  ON public.avaliacoes FOR SELECT
  USING (public.is_admin() OR usuario_id = auth.uid()::text);

DROP POLICY IF EXISTS "Avaliações: cliente avalia a própria reserva" ON public.avaliacoes;
CREATE POLICY "Avaliações: cliente avalia a própria reserva"
  ON public.avaliacoes FOR INSERT
  WITH CHECK (public.is_admin() OR usuario_id = auth.uid()::text);

DROP POLICY IF EXISTS "Avaliações: dono edita, admin modera" ON public.avaliacoes;
CREATE POLICY "Avaliações: dono edita, admin modera"
  ON public.avaliacoes FOR UPDATE
  USING (public.is_admin() OR usuario_id = auth.uid()::text)
  WITH CHECK (public.is_admin() OR usuario_id = auth.uid()::text);

DROP POLICY IF EXISTS "Avaliações: admin exclui" ON public.avaliacoes;
CREATE POLICY "Avaliações: admin exclui"
  ON public.avaliacoes FOR DELETE
  USING (public.is_admin());
