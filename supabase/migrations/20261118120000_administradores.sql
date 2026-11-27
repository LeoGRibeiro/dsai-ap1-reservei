-- ==============================================================================
-- Administradores do painel (login real do admin)
-- Spec: SPEC/2026-11-18-login-real-admin.md
--
-- Ter conta no Supabase Auth não basta para acessar o painel: o usuário precisa
-- estar nesta tabela. Cadastro feito pelo dono do projeto no painel do Supabase.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.administradores (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.administradores ENABLE ROW LEVEL SECURITY;

-- Cada usuário autenticado só enxerga o próprio registro. Sem policy de escrita:
-- inserções e remoções só pelo dono do projeto (SQL Editor / service role).
DROP POLICY IF EXISTS "Administrador lê o próprio registro" ON public.administradores;
CREATE POLICY "Administrador lê o próprio registro"
  ON public.administradores FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Indica se o usuário da sessão atual é administrador.
-- SECURITY DEFINER para funcionar também dentro de policies de RLS de outras tabelas.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.administradores WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
