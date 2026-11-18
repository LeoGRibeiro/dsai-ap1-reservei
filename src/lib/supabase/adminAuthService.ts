/**
 * Autenticação do painel administrativo com o Supabase Auth.
 *
 * Login por e-mail e senha + verificação de permissão pela função
 * `public.is_admin()` (tabela `administradores`). Ter conta no Auth não basta.
 *
 * Spec: SPEC/2026-11-18-login-real-admin.md
 */

import { supabase, isSupabaseConfigured } from "./client";
import {
  MENSAGENS_LOGIN_ADMIN,
  traduzirErroLoginAdmin,
  validarCredenciaisAdmin,
} from "@/lib/adminAuth/regras";

export type ResultadoLoginAdmin = { ok: true } | { ok: false; erro: string };

/** Consulta `is_admin()` para a sessão atual. Qualquer falha nega o acesso. */
async function sessaoEhAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    console.warn("[AdminAuth] Falha ao verificar permissão de administrador:", error.message);
    return false;
  }
  return data === true;
}

/**
 * Faz login com e-mail e senha e confirma que a conta é de administrador.
 * Se a conta não for de administrador, a sessão aberta é encerrada.
 */
export async function entrarComoAdmin(email: string, senha: string): Promise<ResultadoLoginAdmin> {
  const erroValidacao = validarCredenciaisAdmin(email, senha);
  if (erroValidacao) return { ok: false, erro: erroValidacao };
  if (!isSupabaseConfigured()) return { ok: false, erro: MENSAGENS_LOGIN_ADMIN.naoConfigurado };

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    if (error || !data.session) {
      return { ok: false, erro: traduzirErroLoginAdmin(error) };
    }

    if (await sessaoEhAdmin()) return { ok: true };

    await sairAdmin();
    return { ok: false, erro: MENSAGENS_LOGIN_ADMIN.semPermissao };
  } catch (err) {
    console.warn("[AdminAuth] Erro inesperado no login:", err);
    return { ok: false, erro: traduzirErroLoginAdmin(err) };
  }
}

/** Indica se existe sessão ativa de um administrador. */
export async function verificarSessaoAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return false;
    return await sessaoEhAdmin();
  } catch (err) {
    console.warn("[AdminAuth] Erro ao verificar a sessão:", err);
    return false;
  }
}

/** Encerra a sessão. Erros de rede são registrados e não interrompem o logout local. */
export async function sairAdmin(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("[AdminAuth] Erro ao encerrar a sessão:", err);
  }
}

/**
 * Escuta mudanças de sessão (login, logout, expiração, outras abas).
 * @returns Função para cancelar a assinatura.
 */
export function assinarSessaoAdmin(aoMudar: () => void): () => void {
  if (!isSupabaseConfigured()) return () => {};
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => aoMudar());
  return () => subscription.unsubscribe();
}
