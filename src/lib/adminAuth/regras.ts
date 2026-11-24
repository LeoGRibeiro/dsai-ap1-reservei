/**
 * Regras puras do login do painel administrativo: validação dos campos e
 * tradução dos erros do Supabase Auth para mensagens em português.
 *
 * Spec: SPEC/2026-11-18-login-real-admin.md
 */

import { classificarErroAuth } from "@/lib/auth/classificarErroAuth";

export const MENSAGENS_LOGIN_ADMIN = {
  emailObrigatorio: "Informe o e-mail de acesso.",
  emailInvalido: "Informe um e-mail válido.",
  senhaObrigatoria: "Informe a senha.",
  credenciaisInvalidas: "E-mail ou senha incorretos.",
  semPermissao: "Esta conta não tem acesso ao painel administrativo.",
  muitasTentativas: "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.",
  falhaConexao: "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.",
  naoConfigurado: "Login indisponível: o Supabase não está configurado neste ambiente.",
  erroGenerico: "Não foi possível entrar agora. Tente novamente em instantes.",
} as const;

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida os campos antes de chamar o Supabase.
 *
 * @returns Mensagem de erro, ou `null` quando os campos são válidos.
 */
export function validarCredenciaisAdmin(email: string, senha: string): string | null {
  const emailLimpo = email.trim();
  if (!emailLimpo) return MENSAGENS_LOGIN_ADMIN.emailObrigatorio;
  if (!REGEX_EMAIL.test(emailLimpo)) return MENSAGENS_LOGIN_ADMIN.emailInvalido;
  if (!senha) return MENSAGENS_LOGIN_ADMIN.senhaObrigatoria;
  return null;
}

/**
 * Converte um erro do Supabase Auth (ou de rede) em mensagem para o usuário.
 * Credenciais erradas e e-mail não confirmado recebem a mesma mensagem, para
 * não revelar quais e-mails têm conta.
 */
export function traduzirErroLoginAdmin(erro: unknown): string {
  switch (classificarErroAuth(erro)) {
    case "credenciais":
      return MENSAGENS_LOGIN_ADMIN.credenciaisInvalidas;
    case "muitas_tentativas":
      return MENSAGENS_LOGIN_ADMIN.muitasTentativas;
    case "conexao":
      return MENSAGENS_LOGIN_ADMIN.falhaConexao;
    default:
      return MENSAGENS_LOGIN_ADMIN.erroGenerico;
  }
}
