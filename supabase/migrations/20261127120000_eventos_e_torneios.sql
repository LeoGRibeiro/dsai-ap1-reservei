-- Eventos e torneios: cadastro pelo admin, inscrição de times e chave de mata-mata.
-- Spec: SPEC/2026-11-27-eventos-e-torneios.md

CREATE TABLE IF NOT EXISTS public.eventos (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('torneio', 'social')),
  nome TEXT NOT NULL,
  esporte TEXT,
  descricao TEXT,
  regras TEXT,
  data DATE NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fim TEXT NOT NULL,
  quadra_id TEXT,
  valor_inscricao NUMERIC(10, 2) NOT NULL DEFAULT 0,
  max_times INTEGER CHECK (max_times IN (4, 8, 16)),
  inscricoes_ate DATE,
  banner_url TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'publicado', 'chave_sorteada', 'encerrado', 'cancelado')),
  reservas_bloqueio TEXT[] NOT NULL DEFAULT '{}',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_data ON public.eventos (data);

CREATE TABLE IF NOT EXISTS public.eventos_inscricoes (
  id TEXT PRIMARY KEY,
  evento_id TEXT NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL,
  nome_time TEXT NOT NULL CHECK (char_length(trim(nome_time)) BETWEEN 3 AND 40),
  responsavel_nome TEXT NOT NULL DEFAULT '',
  responsavel_whatsapp TEXT NOT NULL DEFAULT '',
  confirmada BOOLEAN NOT NULL DEFAULT FALSE,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_eventos_inscricoes_usuario
  ON public.eventos_inscricoes (evento_id, usuario_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_eventos_inscricoes_nome_time
  ON public.eventos_inscricoes (evento_id, lower(trim(nome_time)));

CREATE TABLE IF NOT EXISTS public.eventos_partidas (
  id TEXT PRIMARY KEY,
  evento_id TEXT NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  rodada INTEGER NOT NULL CHECK (rodada >= 1),
  posicao INTEGER NOT NULL CHECK (posicao >= 0),
  inscricao_a TEXT REFERENCES public.eventos_inscricoes(id) ON DELETE SET NULL,
  inscricao_b TEXT REFERENCES public.eventos_inscricoes(id) ON DELETE SET NULL,
  gols_a INTEGER CHECK (gols_a >= 0),
  gols_b INTEGER CHECK (gols_b >= 0),
  vencedor TEXT,
  resultado TEXT CHECK (resultado IN ('placar', 'penaltis', 'wo', 'bye')),
  UNIQUE (evento_id, rodada, posicao)
);

-- Inscrição: prazo, vagas, conta e bloqueio. A trava no evento evita que duas
-- pessoas fiquem com a última vaga ao mesmo tempo.
CREATE OR REPLACE FUNCTION public.eventos_validar_inscricao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev RECORD;
  inscritos INTEGER;
BEGIN
  SELECT * INTO ev FROM eventos WHERE id = NEW.evento_id FOR UPDATE;

  IF ev.tipo <> 'torneio' OR ev.status <> 'publicado'
     OR ev.data < CURRENT_DATE
     OR (ev.inscricoes_ate IS NOT NULL AND ev.inscricoes_ate < CURRENT_DATE) THEN
    RAISE EXCEPTION 'inscricoes_encerradas' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO inscritos FROM eventos_inscricoes WHERE evento_id = NEW.evento_id;
  IF ev.max_times IS NOT NULL AND inscritos >= ev.max_times THEN
    RAISE EXCEPTION 'vagas_esgotadas' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.is_admin() THEN
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = NEW.usuario_id) THEN
      RAISE EXCEPTION 'conta_necessaria' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM usuarios WHERE id = NEW.usuario_id AND bloqueado) THEN
      RAISE EXCEPTION 'usuario_bloqueado' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  NEW.nome_time := trim(NEW.nome_time);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eventos_validar_inscricao ON public.eventos_inscricoes;
CREATE TRIGGER trg_eventos_validar_inscricao
  BEFORE INSERT ON public.eventos_inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.eventos_validar_inscricao();

-- Times confirmados, sem dados de contato (página pública do evento).
CREATE OR REPLACE VIEW public.eventos_times_publicos AS
SELECT i.id, i.evento_id, i.nome_time
  FROM public.eventos_inscricoes i
  JOIN public.eventos e ON e.id = i.evento_id
 WHERE i.confirmada AND e.status <> 'rascunho';

GRANT SELECT ON public.eventos_times_publicos TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- Regras de acesso
-- ------------------------------------------------------------------------------
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_partidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eventos: público vê os publicados" ON public.eventos;
CREATE POLICY "Eventos: público vê os publicados"
  ON public.eventos FOR SELECT
  USING (status <> 'rascunho' OR public.is_admin());

DROP POLICY IF EXISTS "Eventos: admin gerencia" ON public.eventos;
CREATE POLICY "Eventos: admin gerencia"
  ON public.eventos FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Inscrições: dono ou admin lê" ON public.eventos_inscricoes;
CREATE POLICY "Inscrições: dono ou admin lê"
  ON public.eventos_inscricoes FOR SELECT
  USING (public.is_admin() OR usuario_id = auth.uid()::text);

DROP POLICY IF EXISTS "Inscrições: cliente inscreve o próprio time" ON public.eventos_inscricoes;
CREATE POLICY "Inscrições: cliente inscreve o próprio time"
  ON public.eventos_inscricoes FOR INSERT
  WITH CHECK (public.is_admin() OR (usuario_id = auth.uid()::text AND NOT confirmada));

DROP POLICY IF EXISTS "Inscrições: admin confirma" ON public.eventos_inscricoes;
CREATE POLICY "Inscrições: admin confirma"
  ON public.eventos_inscricoes FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Inscrições: dono desiste antes do sorteio, admin remove" ON public.eventos_inscricoes;
CREATE POLICY "Inscrições: dono desiste antes do sorteio, admin remove"
  ON public.eventos_inscricoes FOR DELETE
  USING (
    public.is_admin()
    OR (
      usuario_id = auth.uid()::text
      AND EXISTS (SELECT 1 FROM public.eventos e WHERE e.id = evento_id AND e.status = 'publicado')
    )
  );

DROP POLICY IF EXISTS "Partidas: leitura pública" ON public.eventos_partidas;
CREATE POLICY "Partidas: leitura pública"
  ON public.eventos_partidas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Partidas: admin gerencia" ON public.eventos_partidas;
CREATE POLICY "Partidas: admin gerencia"
  ON public.eventos_partidas FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
