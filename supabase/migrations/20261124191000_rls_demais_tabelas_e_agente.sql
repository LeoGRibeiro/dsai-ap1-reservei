-- Regras de acesso (RLS), parte 2: contratos, interesses em vagas, fidelidade,
-- conteúdo da landing, imagens e reserva pelo agente (MCP).
-- Depende de public.reserva_e_minha e public.telefone_bloqueado (parte 1).
-- Spec: SPEC/2026-11-24-rls-por-usuario-e-admin.md

-- ------------------------------------------------------------------------------
-- 3. Contratos recorrentes
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir acesso completo a contratos" ON public.contratos_recorrentes;

DROP POLICY IF EXISTS "Contratos: admin gerencia" ON public.contratos_recorrentes;
CREATE POLICY "Contratos: admin gerencia"
  ON public.contratos_recorrentes FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Contato público só das escolinhas (matrícula); grupos são pessoas físicas.
CREATE OR REPLACE VIEW public.contratos_publicos AS
SELECT
  c.id, c.tipo, c.nome, c.esporte, c.descricao, c.quadra_id, c.dias_semana,
  c.hora_inicio, c.hora_fim, c.data_inicio, c.meses, c.foto_url, c.faixa_etaria,
  c.ativo, c.criado_em,
  CASE WHEN c.tipo = 'escolinha' THEN c.responsavel_nome ELSE '' END AS responsavel_nome,
  CASE WHEN c.tipo = 'escolinha' THEN c.contato_whatsapp ELSE '' END AS contato_whatsapp
FROM public.contratos_recorrentes c
WHERE c.ativo;

GRANT SELECT ON public.contratos_publicos TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. Interesses em vagas
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir acesso completo a interesses_vagas" ON public.interesses_vagas;

-- Dono da reserva (consulta direta, sem depender da RLS de reservas).
CREATE OR REPLACE FUNCTION public.sou_dono_da_reserva(p_reserva_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM reservas r
     WHERE r.id = p_reserva_id AND public.reserva_e_minha(r.criado_por, r.user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.reserva_aceita_interesse(p_reserva_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM reservas r
     WHERE r.id = p_reserva_id
       AND r.permite_vagas
       AND COALESCE(r.vagas_abertas, 0) > 0
       AND r.status IN ('pendente', 'confirmada')
       AND NOT public.reserva_e_minha(r.criado_por, r.user_id)
  );
$$;

DROP POLICY IF EXISTS "Interesses: interessado, dono da reserva ou admin lê" ON public.interesses_vagas;
CREATE POLICY "Interesses: interessado, dono da reserva ou admin lê"
  ON public.interesses_vagas FOR SELECT
  USING (public.is_admin() OR usuario_id = auth.uid()::text OR public.sou_dono_da_reserva(reserva_id));

DROP POLICY IF EXISTS "Interesses: cliente registra o próprio" ON public.interesses_vagas;
CREATE POLICY "Interesses: cliente registra o próprio"
  ON public.interesses_vagas FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (usuario_id = auth.uid()::text AND status = 'pendente' AND public.reserva_aceita_interesse(reserva_id))
  );

DROP POLICY IF EXISTS "Interesses: dono da reserva ou admin responde" ON public.interesses_vagas;
CREATE POLICY "Interesses: dono da reserva ou admin responde"
  ON public.interesses_vagas FOR UPDATE
  USING (public.is_admin() OR public.sou_dono_da_reserva(reserva_id))
  WITH CHECK (public.is_admin() OR public.sou_dono_da_reserva(reserva_id));

DROP POLICY IF EXISTS "Interesses: interessado, dono da reserva ou admin remove" ON public.interesses_vagas;
CREATE POLICY "Interesses: interessado, dono da reserva ou admin remove"
  ON public.interesses_vagas FOR DELETE
  USING (public.is_admin() OR usuario_id = auth.uid()::text OR public.sou_dono_da_reserva(reserva_id));

-- ------------------------------------------------------------------------------
-- 5. Fidelidade
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir acesso completo a fidelidade_campanha" ON public.fidelidade_campanha;
DROP POLICY IF EXISTS "Campanha: leitura pública" ON public.fidelidade_campanha;
CREATE POLICY "Campanha: leitura pública"
  ON public.fidelidade_campanha FOR SELECT USING (true);
DROP POLICY IF EXISTS "Campanha: admin gerencia" ON public.fidelidade_campanha;
CREATE POLICY "Campanha: admin gerencia"
  ON public.fidelidade_campanha FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Permitir acesso completo a fidelidade_selos" ON public.fidelidade_selos;
DROP POLICY IF EXISTS "Selos: dono ou admin lê" ON public.fidelidade_selos;
CREATE POLICY "Selos: dono ou admin lê"
  ON public.fidelidade_selos FOR SELECT
  USING (public.is_admin() OR usuario_id = auth.uid()::text);
DROP POLICY IF EXISTS "Selos: dono cria de reserva própria já jogada" ON public.fidelidade_selos;
CREATE POLICY "Selos: dono cria de reserva própria já jogada"
  ON public.fidelidade_selos FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (
      usuario_id = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM public.reservas r
         WHERE r.id = reserva_id
           AND r.user_id = auth.uid()::text
           AND r.status IN ('pendente', 'confirmada')
           AND r.data <= CURRENT_DATE
      )
    )
  );
DROP POLICY IF EXISTS "Selos: dono ou admin altera" ON public.fidelidade_selos;
CREATE POLICY "Selos: dono ou admin altera"
  ON public.fidelidade_selos FOR UPDATE
  USING (public.is_admin() OR usuario_id = auth.uid()::text)
  WITH CHECK (public.is_admin() OR usuario_id = auth.uid()::text);
DROP POLICY IF EXISTS "Selos: admin exclui" ON public.fidelidade_selos;
CREATE POLICY "Selos: admin exclui"
  ON public.fidelidade_selos FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Permitir acesso completo a fidelidade_vouchers" ON public.fidelidade_vouchers;
DROP POLICY IF EXISTS "Vouchers: dono ou admin lê" ON public.fidelidade_vouchers;
CREATE POLICY "Vouchers: dono ou admin lê"
  ON public.fidelidade_vouchers FOR SELECT
  USING (public.is_admin() OR usuario_id = auth.uid()::text);
DROP POLICY IF EXISTS "Vouchers: dono ou admin cria" ON public.fidelidade_vouchers;
CREATE POLICY "Vouchers: dono ou admin cria"
  ON public.fidelidade_vouchers FOR INSERT
  WITH CHECK (public.is_admin() OR usuario_id = auth.uid()::text);
DROP POLICY IF EXISTS "Vouchers: dono ou admin altera" ON public.fidelidade_vouchers;
CREATE POLICY "Vouchers: dono ou admin altera"
  ON public.fidelidade_vouchers FOR UPDATE
  USING (public.is_admin() OR usuario_id = auth.uid()::text)
  WITH CHECK (public.is_admin() OR usuario_id = auth.uid()::text);
DROP POLICY IF EXISTS "Vouchers: admin exclui" ON public.fidelidade_vouchers;
CREATE POLICY "Vouchers: admin exclui"
  ON public.fidelidade_vouchers FOR DELETE USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. Conteúdo da landing e imagens
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir gestão completa de fotos da galeria" ON public.landing_page_gallery;
DROP POLICY IF EXISTS "Galeria: admin gerencia" ON public.landing_page_gallery;
CREATE POLICY "Galeria: admin gerencia"
  ON public.landing_page_gallery FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Permitir gestão completa de escolinhas" ON public.landing_page_schools;
DROP POLICY IF EXISTS "Escolinhas: admin gerencia" ON public.landing_page_schools;
CREATE POLICY "Escolinhas: admin gerencia"
  ON public.landing_page_schools FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Permitir upload no bucket institucional" ON storage.objects;
    DROP POLICY IF EXISTS "Institucional: admin envia" ON storage.objects;
    CREATE POLICY "Institucional: admin envia"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'institucional' AND public.is_admin());
    DROP POLICY IF EXISTS "Institucional: admin altera" ON storage.objects;
    CREATE POLICY "Institucional: admin altera"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'institucional' AND public.is_admin());
    DROP POLICY IF EXISTS "Institucional: admin remove" ON storage.objects;
    CREATE POLICY "Institucional: admin remove"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'institucional' AND public.is_admin());
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 7. Reserva pelo agente (MCP), com as faixas de preço do sistema
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.valor_hora_quadra(p_horario TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  hora INTEGER;
BEGIN
  IF p_horario !~ '^\d{2}:00$' THEN
    RAISE EXCEPTION 'horario_invalido' USING ERRCODE = 'P0001';
  END IF;
  hora := substr(p_horario, 1, 2)::int;
  IF hora BETWEEN 8 AND 11 THEN RETURN 70; END IF;
  IF hora BETWEEN 12 AND 17 THEN RETURN 90; END IF;
  IF hora BETWEEN 18 AND 21 THEN RETURN 110; END IF;
  RAISE EXCEPTION 'horario_invalido' USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION public.criar_reserva_agente(
  p_quadra_id TEXT,
  p_data DATE,
  p_horarios TEXT[],
  p_nome TEXT,
  p_whatsapp TEXT,
  p_esporte TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  horarios TEXT[];
  total NUMERIC := 0;
  sinal NUMERIC;
  h TEXT;
  novo_id TEXT := 'rsv_mcp_' || replace(gen_random_uuid()::text, '-', '');
  digitos TEXT := regexp_replace(COALESCE(p_whatsapp, ''), '\D', '', 'g');
BEGIN
  SELECT array_agg(DISTINCT x ORDER BY x) INTO horarios FROM unnest(p_horarios) AS x;
  IF horarios IS NULL OR p_quadra_id IS NULL OR p_data IS NULL OR p_data < CURRENT_DATE
     OR length(trim(COALESCE(p_nome, ''))) < 2 OR length(digitos) < 10 THEN
    RAISE EXCEPTION 'dados_invalidos' USING ERRCODE = 'P0001';
  END IF;
  FOREACH h IN ARRAY horarios LOOP
    total := total + public.valor_hora_quadra(h);
  END LOOP;
  IF substr(horarios[array_length(horarios, 1)], 1, 2)::int - substr(horarios[1], 1, 2)::int
     <> array_length(horarios, 1) - 1 THEN
    RAISE EXCEPTION 'horarios_nao_consecutivos' USING ERRCODE = 'P0001';
  END IF;
  IF public.telefone_bloqueado(digitos) THEN
    RAISE EXCEPTION 'usuario_bloqueado' USING ERRCODE = 'P0001';
  END IF;

  sinal := round(total * 0.4, 2);

  INSERT INTO reservas (
    id, quadra_id, data, horarios, hora_inicio, hora_fim, nome_cliente, whatsapp_cliente,
    valor_total, valor_sinal, valor_pendente, status, tipo_reserva, esporte, observacoes
  ) VALUES (
    novo_id, p_quadra_id, p_data, horarios, horarios[1],
    lpad((substr(horarios[array_length(horarios, 1)], 1, 2)::int + 1)::text, 2, '0') || ':00',
    trim(p_nome), digitos, total, sinal, total - sinal, 'pendente', 'avulsa', p_esporte,
    'Reserva criada pelo agente (MCP), sinal a confirmar'
  );

  RETURN novo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_reserva_agente(TEXT, DATE, TEXT[], TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_reserva_agente(TEXT, DATE, TEXT[], TEXT, TEXT, TEXT) TO anon, authenticated;
