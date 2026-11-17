-- ==============================================================================
-- Reservei: schema consolidado do banco (Supabase / PostgreSQL)
-- Spec: SPEC/2026-11-17-correcao-schema-banco-novo.md
-- Spec: SPEC/2026-11-17-pipeline-migracoes-supabase.md
--
-- Migração base: cria todo o modelo herdado da AP1. As próximas mudanças de
-- banco são feitas em migrações novas nesta pasta, aplicadas pelo pipeline.
--
-- Script idempotente: pode ser executado mais de uma vez no SQL Editor do
-- Supabase sem erro. Reproduz o modelo de dados herdado da AP1, com as
-- correções necessárias para que ele rode em um banco vazio:
--   1. reservas.user_id passa a ser TEXT (o app grava ids "usr_..."; a coluna
--      UUID com FK para auth.users fazia o insert falhar e o serviço removia
--      o user_id do payload em silêncio).
--   2. Removidas as referências à tabela "profiles", que nunca era criada e
--      não é usada pelo código (o app usa "usuarios").
--   3. Corrigido o bloco da policy de contratos_recorrentes (faltava END IF).
--   4. Corrigida a codificação de caracteres dos comentários.
--
-- ATENÇÃO: as policies abaixo continuam permissivas (USING true), como na AP1.
-- O endurecimento de segurança (Supabase Auth, RLS por usuário e por admin)
-- será feito em migrações próprias, cada uma com a sua spec.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Reservas (avulsas, manuais, ocorrências de contratos e bloqueios)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservas (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  quadra_id TEXT NOT NULL,
  nome_cliente TEXT NOT NULL DEFAULT '',
  whatsapp_cliente TEXT NOT NULL DEFAULT '',
  telefone_cliente TEXT DEFAULT '',
  cpf_cliente TEXT NOT NULL DEFAULT '',
  data DATE NOT NULL,
  horarios TEXT[] NOT NULL DEFAULT '{}',
  hora_inicio TEXT NOT NULL,
  hora_fim TEXT NOT NULL,
  valor_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  valor_sinal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  valor_pendente NUMERIC(10, 2) NOT NULL DEFAULT 0,
  valor_original NUMERIC(10, 2),
  desconto_fidelidade NUMERIC(10, 2) DEFAULT 0,
  vouchers_utilizados TEXT[] DEFAULT '{}',
  reserva_gratuita_fidelidade BOOLEAN DEFAULT FALSE,
  metodo_pagamento TEXT DEFAULT 'pix',
  status TEXT NOT NULL DEFAULT 'em_processamento',
  status_whatsapp TEXT NOT NULL DEFAULT 'nao_enviado',
  esporte TEXT,
  observacoes TEXT,
  contrato_id TEXT,
  tipo_reserva TEXT DEFAULT 'avulsa',
  aviso_cancelamento_em DATE,
  permite_vagas BOOLEAN DEFAULT FALSE,
  vagas_abertas INTEGER DEFAULT 0,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bancos criados com o script antigo: garante as colunas novas.
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS valor_original NUMERIC(10, 2);
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS desconto_fidelidade NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS vouchers_utilizados TEXT[] DEFAULT '{}';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS reserva_gratuita_fidelidade BOOLEAN DEFAULT FALSE;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'pix';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS contrato_id TEXT;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS tipo_reserva TEXT DEFAULT 'avulsa';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS aviso_cancelamento_em DATE;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS permite_vagas BOOLEAN DEFAULT FALSE;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS vagas_abertas INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_reservas_data_quadra ON public.reservas (data, quadra_id);
CREATE INDEX IF NOT EXISTS idx_reservas_status ON public.reservas (status);
CREATE INDEX IF NOT EXISTS idx_reservas_contrato ON public.reservas (contrato_id);
CREATE INDEX IF NOT EXISTS idx_reservas_user ON public.reservas (user_id);

ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de reservas" ON public.reservas;
CREATE POLICY "Permitir leitura pública de reservas"
  ON public.reservas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção de novas reservas" ON public.reservas;
CREATE POLICY "Permitir inserção de novas reservas"
  ON public.reservas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de reservas" ON public.reservas;
CREATE POLICY "Permitir atualização de reservas"
  ON public.reservas FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir remoção de reservas" ON public.reservas;
CREATE POLICY "Permitir remoção de reservas"
  ON public.reservas FOR DELETE USING (true);

-- Realtime na tabela de reservas (agenda e portal atualizam ao vivo).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reservas'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Usuários (cadastro por WhatsApp e senha)
-- Será substituído pelo Supabase Auth na spec de autenticação de clientes.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  data_nascimento DATE,
  bloqueado BOOLEAN DEFAULT FALSE,
  motivo_bloqueio TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN DEFAULT FALSE;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS motivo_bloqueio TEXT;

CREATE INDEX IF NOT EXISTS idx_usuarios_telefone ON public.usuarios (telefone);

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso completo a usuarios" ON public.usuarios;
CREATE POLICY "Permitir acesso completo a usuarios"
  ON public.usuarios FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. Contratos recorrentes (escolinhas e grupos fixos)
-- Spec: SPEC/2026-10-05-reservas-recorrentes.md
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contratos_recorrentes (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('escolinha', 'grupo')),
  nome TEXT NOT NULL,
  esporte TEXT,
  descricao TEXT,
  responsavel_nome TEXT NOT NULL DEFAULT '',
  contato_whatsapp TEXT NOT NULL DEFAULT '',
  quadra_id TEXT NOT NULL,
  dias_semana INTEGER[] NOT NULL DEFAULT '{}',
  hora_inicio TEXT NOT NULL,
  hora_fim TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  meses INTEGER NOT NULL DEFAULT 6,
  foto_url TEXT,
  faixa_etaria TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contratos_recorrentes ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.contratos_recorrentes ADD COLUMN IF NOT EXISTS faixa_etaria TEXT;

CREATE INDEX IF NOT EXISTS idx_contratos_tipo ON public.contratos_recorrentes (tipo, ativo);

ALTER TABLE public.contratos_recorrentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso completo a contratos" ON public.contratos_recorrentes;
CREATE POLICY "Permitir acesso completo a contratos"
  ON public.contratos_recorrentes FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. Vagas abertas para jogadores
-- Spec: SPEC/2026-10-05-sistema-vagas-jogadores.md
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interesses_vagas (
  id TEXT PRIMARY KEY,
  reserva_id TEXT NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL,
  nome_usuario TEXT NOT NULL DEFAULT '',
  telefone_usuario TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interesses_reserva ON public.interesses_vagas (reserva_id);
CREATE INDEX IF NOT EXISTS idx_interesses_usuario ON public.interesses_vagas (usuario_id);

ALTER TABLE public.interesses_vagas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso completo a interesses_vagas" ON public.interesses_vagas;
CREATE POLICY "Permitir acesso completo a interesses_vagas"
  ON public.interesses_vagas FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. Programa de fidelidade (campanha, selos e vouchers)
-- Spec: SPEC/2026-10-05-sistema-fidelidade.md
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fidelidade_campanha (
  id TEXT PRIMARY KEY DEFAULT 'campanha_padrao',
  nome TEXT NOT NULL DEFAULT 'Fidelidade Campeão Reservei',
  horas_necessarias INTEGER NOT NULL DEFAULT 12,
  meses_validade INTEGER NOT NULL DEFAULT 3,
  dias_validade_voucher INTEGER NOT NULL DEFAULT 60,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.fidelidade_campanha (id, nome, horas_necessarias, meses_validade, dias_validade_voucher, ativo)
VALUES ('campanha_padrao', 'Fidelidade Campeão Reservei', 12, 3, 60, TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.fidelidade_campanha ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso completo a fidelidade_campanha" ON public.fidelidade_campanha;
CREATE POLICY "Permitir acesso completo a fidelidade_campanha"
  ON public.fidelidade_campanha FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.fidelidade_selos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  reserva_id TEXT NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  horas_contabilizadas INTEGER NOT NULL DEFAULT 1,
  valor_por_hora NUMERIC(10, 2) NOT NULL DEFAULT 0,
  valor_total_reserva NUMERIC(10, 2) NOT NULL DEFAULT 0,
  data_jogo DATE NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_em DATE NOT NULL,
  resgatado BOOLEAN NOT NULL DEFAULT FALSE,
  voucher_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_fidelidade_selos_usuario ON public.fidelidade_selos (usuario_id, resgatado, expira_em);
CREATE INDEX IF NOT EXISTS idx_fidelidade_selos_reserva ON public.fidelidade_selos (reserva_id);

ALTER TABLE public.fidelidade_selos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso completo a fidelidade_selos" ON public.fidelidade_selos;
CREATE POLICY "Permitir acesso completo a fidelidade_selos"
  ON public.fidelidade_selos FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.fidelidade_vouchers (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  usuario_id TEXT NOT NULL,
  valor_teto NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'disponivel', -- 'disponivel' | 'utilizado' | 'expirado'
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_em DATE NOT NULL,
  reserva_utilizada_id TEXT REFERENCES public.reservas(id) ON DELETE SET NULL,
  utilizado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fidelidade_vouchers_usuario ON public.fidelidade_vouchers (usuario_id, status);
CREATE INDEX IF NOT EXISTS idx_fidelidade_vouchers_codigo ON public.fidelidade_vouchers (codigo);

ALTER TABLE public.fidelidade_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso completo a fidelidade_vouchers" ON public.fidelidade_vouchers;
CREATE POLICY "Permitir acesso completo a fidelidade_vouchers"
  ON public.fidelidade_vouchers FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. Landing page: conteúdo institucional (galeria e escolinhas)
-- Spec: SPEC/2026-10-06-lp-conteudo-institucional.md
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.landing_page_gallery (
  id TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'quadras',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lp_gallery_order ON public.landing_page_gallery (display_order, is_active);
CREATE INDEX IF NOT EXISTS idx_lp_gallery_categoria ON public.landing_page_gallery (categoria);

ALTER TABLE public.landing_page_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de fotos da galeria" ON public.landing_page_gallery;
CREATE POLICY "Permitir leitura pública de fotos da galeria"
  ON public.landing_page_gallery FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir gestão completa de fotos da galeria" ON public.landing_page_gallery;
CREATE POLICY "Permitir gestão completa de fotos da galeria"
  ON public.landing_page_gallery FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.landing_page_schools (
  id TEXT PRIMARY KEY,
  contrato_id TEXT,
  sport_name TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  teacher_image_url TEXT NOT NULL,
  schedule_info TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  descricao TEXT,
  faixa_etaria TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.landing_page_schools ADD COLUMN IF NOT EXISTS contrato_id TEXT;

CREATE INDEX IF NOT EXISTS idx_lp_schools_active ON public.landing_page_schools (is_active, sport_name);
CREATE INDEX IF NOT EXISTS idx_lp_schools_contrato ON public.landing_page_schools (contrato_id);

ALTER TABLE public.landing_page_schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de escolinhas" ON public.landing_page_schools;
CREATE POLICY "Permitir leitura pública de escolinhas"
  ON public.landing_page_schools FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir gestão completa de escolinhas" ON public.landing_page_schools;
CREATE POLICY "Permitir gestão completa de escolinhas"
  ON public.landing_page_schools FOR ALL USING (true) WITH CHECK (true);

-- Bucket público para as fotos institucionais.
INSERT INTO storage.buckets (id, name, public)
VALUES ('institucional', 'institucional', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Permitir leitura pública do bucket institucional" ON storage.objects;
CREATE POLICY "Permitir leitura pública do bucket institucional"
  ON storage.objects FOR SELECT USING (bucket_id = 'institucional');

DROP POLICY IF EXISTS "Permitir upload no bucket institucional" ON storage.objects;
CREATE POLICY "Permitir upload no bucket institucional"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'institucional');
