-- Regras de acesso (RLS), parte 1: reservas e usuários. Substitui as policies
-- permissivas (USING true) herdadas da AP1.
-- Spec: SPEC/2026-11-24-rls-por-usuario-e-admin.md

-- ------------------------------------------------------------------------------
-- 1. Reservas
-- ------------------------------------------------------------------------------
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS criado_por UUID DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS idx_reservas_criado_por ON public.reservas (criado_por);

CREATE OR REPLACE FUNCTION public.reserva_e_minha(p_criado_por UUID, p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  -- COALESCE: com user_id nulo a comparação daria NULL, e NOT NULL não é verdadeiro.
  SELECT COALESCE(auth.uid() IS NOT NULL
     AND (p_criado_por = auth.uid() OR p_user_id = auth.uid()::text), FALSE);
$$;

DROP POLICY IF EXISTS "Permitir leitura pública de reservas" ON public.reservas;
DROP POLICY IF EXISTS "Permitir inserção de novas reservas" ON public.reservas;
DROP POLICY IF EXISTS "Permitir atualização de reservas" ON public.reservas;
DROP POLICY IF EXISTS "Permitir remoção de reservas" ON public.reservas;

DROP POLICY IF EXISTS "Reservas: dono ou admin lê" ON public.reservas;
CREATE POLICY "Reservas: dono ou admin lê"
  ON public.reservas FOR SELECT
  USING (public.is_admin() OR public.reserva_e_minha(criado_por, user_id));

DROP POLICY IF EXISTS "Reservas: sessão cria a própria provisória" ON public.reservas;
CREATE POLICY "Reservas: sessão cria a própria provisória"
  ON public.reservas FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() IS NOT NULL
      AND criado_por = auth.uid()
      AND status = 'em_processamento'
      AND COALESCE(tipo_reserva, 'avulsa') = 'avulsa'
      AND contrato_id IS NULL
      AND (user_id IS NULL OR user_id = auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "Reservas: dono ou admin altera" ON public.reservas;
CREATE POLICY "Reservas: dono ou admin altera"
  ON public.reservas FOR UPDATE
  USING (public.is_admin() OR public.reserva_e_minha(criado_por, user_id))
  WITH CHECK (public.is_admin() OR public.reserva_e_minha(criado_por, user_id));

DROP POLICY IF EXISTS "Reservas: dono exclui a provisória, admin qualquer" ON public.reservas;
CREATE POLICY "Reservas: dono exclui a provisória, admin qualquer"
  ON public.reservas FOR DELETE
  USING (
    public.is_admin()
    OR (criado_por = auth.uid() AND status = 'em_processamento')
  );

-- O que o cliente pode mudar numa reserva (o admin pode tudo).
CREATE OR REPLACE FUNCTION public.reservas_validar_alteracao_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  digitos TEXT;
BEGIN
  IF public.is_admin() OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid()::text AND bloqueado) THEN
      RAISE EXCEPTION 'usuario_bloqueado' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.quadra_id IS DISTINCT FROM OLD.quadra_id
     OR NEW.data IS DISTINCT FROM OLD.data
     OR NEW.horarios IS DISTINCT FROM OLD.horarios
     OR NEW.hora_inicio IS DISTINCT FROM OLD.hora_inicio
     OR NEW.hora_fim IS DISTINCT FROM OLD.hora_fim
     OR NEW.tipo_reserva IS DISTINCT FROM OLD.tipo_reserva
     OR NEW.contrato_id IS DISTINCT FROM OLD.contrato_id
     OR NEW.criado_por IS DISTINCT FROM OLD.criado_por THEN
    RAISE EXCEPTION 'alteracao_nao_permitida' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
       (OLD.status = 'em_processamento' AND NEW.status IN ('pendente', 'confirmada', 'cancelada'))
    OR (OLD.status IN ('pendente', 'confirmada') AND NEW.status = 'cancelada')
  ) THEN
    RAISE EXCEPTION 'alteracao_nao_permitida' USING ERRCODE = 'P0001';
  END IF;

  IF OLD.status <> 'em_processamento' AND (
       NEW.valor_total IS DISTINCT FROM OLD.valor_total
    OR NEW.valor_sinal IS DISTINCT FROM OLD.valor_sinal
    OR NEW.valor_pendente IS DISTINCT FROM OLD.valor_pendente
    OR NEW.valor_original IS DISTINCT FROM OLD.valor_original
    OR NEW.desconto_fidelidade IS DISTINCT FROM OLD.desconto_fidelidade
    OR NEW.vouchers_utilizados IS DISTINCT FROM OLD.vouchers_utilizados
    OR NEW.reserva_gratuita_fidelidade IS DISTINCT FROM OLD.reserva_gratuita_fidelidade
    OR NEW.metodo_pagamento IS DISTINCT FROM OLD.metodo_pagamento
  ) THEN
    RAISE EXCEPTION 'alteracao_nao_permitida' USING ERRCODE = 'P0001';
  END IF;

  -- Vincular a reserva a outra conta é ignorado (o app tenta vincular pelo WhatsApp).
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     AND NOT (OLD.user_id IS NULL AND NEW.user_id = auth.uid()::text) THEN
    NEW.user_id := OLD.user_id;
  END IF;

  digitos := regexp_replace(COALESCE(NEW.whatsapp_cliente, ''), '\D', '', 'g');
  IF digitos <> '' AND digitos IS DISTINCT FROM regexp_replace(COALESCE(OLD.whatsapp_cliente, ''), '\D', '', 'g')
     AND EXISTS (SELECT 1 FROM usuarios WHERE telefone = digitos AND bloqueado) THEN
    RAISE EXCEPTION 'usuario_bloqueado' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservas_alteracao_cliente ON public.reservas;
CREATE TRIGGER trg_reservas_alteracao_cliente
  BEFORE INSERT OR UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.reservas_validar_alteracao_cliente();

-- Grade pública: sem nome, WhatsApp e CPF de clientes.
CREATE OR REPLACE VIEW public.reservas_publicas AS
SELECT
  r.id, r.quadra_id, r.data, r.horarios, r.hora_inicio, r.hora_fim,
  r.status, r.tipo_reserva, r.contrato_id, r.aviso_cancelamento_em,
  r.permite_vagas, r.vagas_abertas, r.esporte, r.criada_em, r.expira_em,
  CASE WHEN r.tipo_reserva IN ('manutencao_bloqueio', 'escolinha') THEN r.nome_cliente ELSE '' END AS nome_cliente,
  CASE WHEN r.tipo_reserva = 'escolinha' THEN r.whatsapp_cliente ELSE '' END AS whatsapp_cliente,
  CASE WHEN r.tipo_reserva IN ('manutencao_bloqueio', 'escolinha') THEN r.observacoes END AS observacoes
FROM public.reservas r
WHERE r.data >= CURRENT_DATE - 1
  AND (r.status <> 'cancelada' OR r.contrato_id IS NOT NULL);

GRANT SELECT ON public.reservas_publicas TO anon, authenticated;

-- Horários ocupados: sem dados pessoais, base da atualização ao vivo da grade.
DROP POLICY IF EXISTS "Horários ocupados: leitura pública" ON public.reservas_horarios;
CREATE POLICY "Horários ocupados: leitura pública"
  ON public.reservas_horarios FOR SELECT USING (true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reservas_horarios'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas_horarios;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Usuários
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir acesso completo a usuarios" ON public.usuarios;

DROP POLICY IF EXISTS "Usuários: próprio perfil ou admin lê" ON public.usuarios;
CREATE POLICY "Usuários: próprio perfil ou admin lê"
  ON public.usuarios FOR SELECT
  USING (public.is_admin() OR id = auth.uid()::text);

DROP POLICY IF EXISTS "Usuários: próprio perfil ou admin altera" ON public.usuarios;
CREATE POLICY "Usuários: próprio perfil ou admin altera"
  ON public.usuarios FOR UPDATE
  USING (public.is_admin() OR id = auth.uid()::text)
  WITH CHECK (public.is_admin() OR id = auth.uid()::text);

DROP POLICY IF EXISTS "Usuários: admin exclui" ON public.usuarios;
CREATE POLICY "Usuários: admin exclui"
  ON public.usuarios FOR DELETE USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.usuarios_validar_alteracao_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.telefone IS DISTINCT FROM OLD.telefone
     OR NEW.bloqueado IS DISTINCT FROM OLD.bloqueado
     OR NEW.motivo_bloqueio IS DISTINCT FROM OLD.motivo_bloqueio THEN
    RAISE EXCEPTION 'alteracao_nao_permitida' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuarios_alteracao_cliente ON public.usuarios;
CREATE TRIGGER trg_usuarios_alteracao_cliente
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.usuarios_validar_alteracao_cliente();

-- Consulta de bloqueio sem expor o cadastro.
CREATE OR REPLACE FUNCTION public.telefone_bloqueado(p_telefone TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
     WHERE telefone = regexp_replace(COALESCE(p_telefone, ''), '\D', '', 'g')
       AND bloqueado
  );
$$;

REVOKE ALL ON FUNCTION public.telefone_bloqueado(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.telefone_bloqueado(TEXT) TO anon, authenticated;
