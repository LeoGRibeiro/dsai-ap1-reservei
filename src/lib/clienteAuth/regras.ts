/**
 * Regras puras do login do cliente: e-mail interno derivado do WhatsApp e
 * mensagens de erro do Supabase Auth.
 *
 * O cliente entra com WhatsApp e senha (SPEC/2026-10-01-sistema-usuarios.md);
 * o Supabase Auth recebe "<dígitos>@clientes.reservei.app". O mesmo domínio
 * está no trigger de perfil da migração 20261124170000.
 *
 * Spec: SPEC/2026-11-24-login-cliente-supabase-auth.md
 */

import { classificarErroAuth } from "@/lib/auth/classificarErroAuth";

export const DOMINIO_LOGIN_CLIENTE = "clientes.reservei.app";

export const MENSAGENS_AUTH_CLIENTE = {
  telefoneInvalido: "Informe um WhatsApp válido com DDD.",
  whatsappCadastrado: "Este número de WhatsApp já possui uma conta cadastrada.",
  credenciaisInvalidas: "WhatsApp ou senha incorretos.",
  senhaFraca: "A senha não foi aceita. Use pelo menos 6 caracteres.",
  muitasTentativas: "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.",
  falhaConexao: "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.",
  naoConfigurado: "Login indisponível: o Supabase não está configurado neste ambiente.",
  erroGenerico: "Não foi possível concluir agora. Tente novamente em instantes.",
} as const;

/** E-mail interno do cliente, ou `null` se o número tiver menos de 10 dígitos. */
export function emailDoTelefone(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return `${digitos}@${DOMINIO_LOGIN_CLIENTE}`;
}

export function traduzirErroAuthCliente(erro: unknown): string {
  switch (classificarErroAuth(erro)) {
    case "credenciais":
      return MENSAGENS_AUTH_CLIENTE.credenciaisInvalidas;
    case "ja_cadastrado":
      return MENSAGENS_AUTH_CLIENTE.whatsappCadastrado;
    case "senha_fraca":
      return MENSAGENS_AUTH_CLIENTE.senhaFraca;
    case "muitas_tentativas":
      return MENSAGENS_AUTH_CLIENTE.muitasTentativas;
    case "conexao":
      return MENSAGENS_AUTH_CLIENTE.falhaConexao;
    default:
      return MENSAGENS_AUTH_CLIENTE.erroGenerico;
  }
}
