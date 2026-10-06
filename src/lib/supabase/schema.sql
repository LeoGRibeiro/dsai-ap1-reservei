-- ==============================================================================
-- Schema da Tabela 'reservas' para o Supabase (PostgreSQL)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reservas (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
  status TEXT NOT NULL DEFAULT 'em_processamento',
  status_whatsapp TEXT NOT NULL DEFAULT 'nao_enviado',
  esporte TEXT,
  observacoes TEXT,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração incremental caso a coluna user_id não exista em bases já criadas
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS valor_original NUMERIC(10, 2);
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS desconto_fidelidade NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS vouchers_utilizados TEXT[] DEFAULT '{}';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS reserva_gratuita_fidelidade BOOLEAN DEFAULT false;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'pix';


-- Tabela de Usuários para Login com WhatsApp e Senha (sem exigência de provedor de SMS pago)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  data_nascimento DATE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_telefone ON public.usuarios (telefone);

-- Habilitar RLS em usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'usuarios' AND policyname = 'Permitir acesso completo a usuarios'
  ) THEN
    CREATE POLICY "Permitir acesso completo a usuarios"
      ON public.usuarios FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Índices para consultas otimizadas da agenda e prevenção de double booking
CREATE INDEX IF NOT EXISTS idx_reservas_data_quadra ON public.reservas (data, quadra_id);
CREATE INDEX IF NOT EXISTS idx_reservas_status ON public.reservas (status);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para a Anon Key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reservas' AND policyname = 'Permitir leitura pública de reservas'
  ) THEN
    CREATE POLICY "Permitir leitura pública de reservas"
      ON public.reservas FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reservas' AND policyname = 'Permitir inserção de novas reservas'
  ) THEN
    CREATE POLICY "Permitir inserção de novas reservas"
      ON public.reservas FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reservas' AND policyname = 'Permitir atualização de reservas'
  ) THEN
    CREATE POLICY "Permitir atualização de reservas"
      ON public.reservas FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reservas' AND policyname = 'Permitir remoção de reservas'
  ) THEN
    CREATE POLICY "Permitir remoção de reservas"
      ON public.reservas FOR DELETE
      USING (true);
  END IF;
END $$;

-- Habilitar RLS em profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Permitir leitura de perfis'
  ) THEN
    CREATE POLICY "Permitir leitura de perfis"
      ON public.profiles FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Permitir inserção e atualização do próprio perfil'
  ) THEN
    CREATE POLICY "Permitir inserção e atualização do próprio perfil"
      ON public.profiles FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Habilita Realtime na publicação padrão do Supabase
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- Reservas recorrentes (Escolinhas e Grupos Comuns)
-- Spec: SPEC/2026-10-05-reservas-recorrentes.md
-- ==============================================================================

-- Campos que ligam cada ocorrência (reserva materializada) ao seu contrato
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS contrato_id TEXT;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS tipo_reserva TEXT DEFAULT 'avulsa';
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS aviso_cancelamento_em DATE;

CREATE INDEX IF NOT EXISTS idx_reservas_contrato ON public.reservas (contrato_id);

-- Contratos recorrentes: um registro por escolinha ou grupo
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
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratos_tipo ON public.contratos_recorrentes (tipo, ativo);

ALTER TABLE public.contratos_recorrentes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contratos_recorrentes' AND policyname = 'Permitir acesso completo a contratos'
  ) THEN
    CREATE POLICY "Permitir acesso completo a contratos"
      ON public.contratos_recorrentes FOR ALL
      USING (true)
      WITH CHECK (true);
END $$;

-- ==============================================================================
-- Sistema de Vagas Abertas para Jogadores
-- Spec: SPEC/2026-10-05-sistema-vagas-jogadores.md
-- ==============================================================================

-- 1. Colunas adicionais na tabela 'reservas'
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS permite_vagas BOOLEAN DEFAULT FALSE;
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS vagas_abertas INTEGER DEFAULT 0;

-- 2. Tabela de Interesses de Vagas
CREATE TABLE IF NOT EXISTS public.interesses_vagas (
  id TEXT PRIMARY KEY,
  reserva_id TEXT NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL,
  nome_usuario TEXT NOT NULL DEFAULT '',
  telefone_usuario TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas otimizadas
CREATE INDEX IF NOT EXISTS idx_interesses_reserva ON public.interesses_vagas (reserva_id);
CREATE INDEX IF NOT EXISTS idx_interesses_usuario ON public.interesses_vagas (usuario_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.interesses_vagas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'interesses_vagas' AND policyname = 'Permitir acesso completo a interesses_vagas'
  ) THEN
    CREATE POLICY "Permitir acesso completo a interesses_vagas"
      ON public.interesses_vagas FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ==============================================================================
-- Sistema de Fidelidade (Ticket Médio e Recompensas)
-- Spec: SPEC/2026-10-05-sistema-fidelidade.md
-- ==============================================================================

-- 1. Tabela de Configuração da Campanha
CREATE TABLE IF NOT EXISTS public.fidelidade_campanha (
  id TEXT PRIMARY KEY DEFAULT 'campanha_padrao',
  nome TEXT NOT NULL DEFAULT 'Fidelidade Campeão Reservei',
  horas_necessarias INTEGER NOT NULL DEFAULT 12,
  meses_validade INTEGER NOT NULL DEFAULT 3,
  dias_validade_voucher INTEGER NOT NULL DEFAULT 60,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insere campanha padrão se não existir
INSERT INTO public.fidelidade_campanha (id, nome, horas_necessarias, meses_validade, dias_validade_voucher, ativo)
VALUES ('campanha_padrao', 'Fidelidade Campeão Reservei', 12, 3, 60, true)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS em fidelidade_campanha
ALTER TABLE public.fidelidade_campanha ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fidelidade_campanha' AND policyname = 'Permitir acesso completo a fidelidade_campanha'
  ) THEN
    CREATE POLICY "Permitir acesso completo a fidelidade_campanha"
      ON public.fidelidade_campanha FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 2. Tabela de Selos de Horas Concluídas
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

-- Habilitar RLS em fidelidade_selos
ALTER TABLE public.fidelidade_selos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fidelidade_selos' AND policyname = 'Permitir acesso completo a fidelidade_selos'
  ) THEN
    CREATE POLICY "Permitir acesso completo a fidelidade_selos"
      ON public.fidelidade_selos FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 3. Tabela de Vouchers Conquistados
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

-- Habilitar RLS em fidelidade_vouchers
ALTER TABLE public.fidelidade_vouchers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fidelidade_vouchers' AND policyname = 'Permitir acesso completo a fidelidade_vouchers'
  ) THEN
    CREATE POLICY "Permitir acesso completo a fidelidade_vouchers"
      ON public.fidelidade_vouchers FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;


