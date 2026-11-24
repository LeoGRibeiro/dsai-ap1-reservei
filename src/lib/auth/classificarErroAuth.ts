/**
 * Classifica erros do Supabase Auth (ou de rede) em categorias, para cada
 * tela escolher a sua mensagem. Usado pelo login do admin e do cliente.
 */

export type CategoriaErroAuth =
  | "credenciais"
  | "ja_cadastrado"
  | "senha_fraca"
  | "muitas_tentativas"
  | "conexao"
  | "outro";

interface ErroAuth {
  name?: string;
  message?: string;
  status?: number;
  code?: string;
}

export function classificarErroAuth(erro: unknown): CategoriaErroAuth {
  if (!erro || typeof erro !== "object") return "outro";

  const { name = "", message = "", status, code = "" } = erro as ErroAuth;
  const texto = `${code} ${message}`.toLowerCase();

  if (code === "invalid_credentials" || code === "email_not_confirmed" || texto.includes("invalid login credentials") || texto.includes("email not confirmed")) {
    return "credenciais";
  }
  if (code === "user_already_exists" || code === "email_exists" || texto.includes("already registered")) {
    return "ja_cadastrado";
  }
  if (code === "weak_password" || texto.includes("password should be")) {
    return "senha_fraca";
  }
  if (status === 429 || texto.includes("rate limit")) {
    return "muitas_tentativas";
  }
  if (name === "AuthRetryableFetchError" || status === 0 || texto.includes("failed to fetch") || texto.includes("network")) {
    return "conexao";
  }
  return "outro";
}
