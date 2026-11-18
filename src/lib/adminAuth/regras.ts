/**
 * Regras puras do login do painel administrativo: validação dos campos e
 * tradução dos erros do Supabase Auth para mensagens em português.
 *
 * Spec: SPEC/2026-11-18-login-real-admin.md
 */

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

interface ErroAuth {
  name?: string;
  message?: string;
  status?: number;
  code?: string;
}

/**
 * Converte um erro do Supabase Auth (ou de rede) em mensagem para o usuário.
 * Credenciais erradas e e-mail não confirmado recebem a mesma mensagem, para
 * não revelar quais e-mails têm conta.
 */
export function traduzirErroLoginAdmin(erro: unknown): string {
  if (!erro || typeof erro !== "object") return MENSAGENS_LOGIN_ADMIN.erroGenerico;

  const { name = "", message = "", status, code = "" } = erro as ErroAuth;
  const texto = `${code} ${message}`.toLowerCase();

  if (code === "invalid_credentials" || code === "email_not_confirmed" || texto.includes("invalid login credentials") || texto.includes("email not confirmed")) {
    return MENSAGENS_LOGIN_ADMIN.credenciaisInvalidas;
  }
  if (status === 429 || texto.includes("rate limit")) {
    return MENSAGENS_LOGIN_ADMIN.muitasTentativas;
  }
  if (name === "AuthRetryableFetchError" || status === 0 || texto.includes("failed to fetch") || texto.includes("network")) {
    return MENSAGENS_LOGIN_ADMIN.falhaConexao;
  }
  return MENSAGENS_LOGIN_ADMIN.erroGenerico;
}
