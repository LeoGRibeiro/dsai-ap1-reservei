-- Login do cliente com Supabase Auth: perfil criado pelo banco a partir de
-- auth.users e fim da senha em texto puro em public.usuarios.
-- Spec: SPEC/2026-11-24-login-cliente-supabase-auth.md

-- Perfis da AP1 sem usuário no Auth não conseguem mais entrar e bloqueariam o
-- recadastro do mesmo WhatsApp (telefone é único).
DELETE FROM public.usuarios u
 WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id::text = u.id);

ALTER TABLE public.usuarios DROP COLUMN IF EXISTS senha;

-- Cria ou atualiza o perfil quando surge um e-mail interno de cliente
-- (<dígitos do WhatsApp>@clientes.reservei.app). O telefone vem do próprio
-- e-mail, para o perfil sempre corresponder ao login.
CREATE OR REPLACE FUNCTION public.sincronizar_perfil_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  nascimento TEXT := meta->>'data_nascimento';
BEGIN
  IF NEW.email IS NULL OR NEW.email NOT LIKE '%@clientes.reservei.app' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.email IS NOT DISTINCT FROM NEW.email THEN
    RETURN NEW;
  END IF;

  INSERT INTO usuarios (id, nome, telefone, data_nascimento)
  VALUES (
    NEW.id::text,
    COALESCE(NULLIF(meta->>'nome', ''), 'Cliente'),
    split_part(NEW.email, '@', 1),
    CASE WHEN nascimento ~ '^\d{4}-\d{2}-\d{2}$' THEN nascimento::date END
  )
  ON CONFLICT (id) DO UPDATE
    SET nome = EXCLUDED.nome,
        telefone = EXCLUDED.telefone,
        data_nascimento = COALESCE(EXCLUDED.data_nascimento, usuarios.data_nascimento);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_perfil_cliente ON auth.users;
CREATE TRIGGER trg_perfil_cliente
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_perfil_cliente();

-- Exclusão da própria conta (LGPD): perfil e usuário do Auth.
CREATE OR REPLACE FUNCTION public.excluir_minha_conta()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'sem_sessao' USING ERRCODE = 'P0001';
  END IF;
  DELETE FROM usuarios WHERE id = auth.uid()::text;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.excluir_minha_conta() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_minha_conta() TO authenticated;
