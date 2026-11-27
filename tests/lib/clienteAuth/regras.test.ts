import { describe, it, expect } from "vitest";
import {
  DOMINIO_LOGIN_CLIENTE,
  MENSAGENS_AUTH_CLIENTE,
  emailDoTelefone,
  traduzirErroAuthCliente,
} from "@/lib/clienteAuth/regras";

// Spec: SPEC/2026-11-24-login-cliente-supabase-auth.md

describe("emailDoTelefone", () => {
  it("usa só os dígitos do WhatsApp", () => {
    expect(emailDoTelefone("(91) 99999-8888")).toBe(`91999998888@${DOMINIO_LOGIN_CLIENTE}`);
  });

  it("mesmo número com e sem máscara gera o mesmo login", () => {
    expect(emailDoTelefone("91 99999 8888")).toBe(emailDoTelefone("91999998888"));
  });

  it("recusa número com menos de 10 dígitos", () => {
    expect(emailDoTelefone("9999-8888")).toBeNull();
    expect(emailDoTelefone("")).toBeNull();
  });

  it("domínio igual ao usado no trigger do banco", () => {
    expect(DOMINIO_LOGIN_CLIENTE).toBe("clientes.reservei.app");
  });
});

describe("traduzirErroAuthCliente", () => {
  it("WhatsApp já cadastrado", () => {
    expect(traduzirErroAuthCliente({ code: "user_already_exists", message: "User already registered" })).toBe(
      MENSAGENS_AUTH_CLIENTE.whatsappCadastrado
    );
    expect(traduzirErroAuthCliente({ code: "email_exists", message: "" })).toBe(MENSAGENS_AUTH_CLIENTE.whatsappCadastrado);
  });

  it("credenciais erradas não revelam se o número tem conta", () => {
    expect(traduzirErroAuthCliente({ code: "invalid_credentials", message: "Invalid login credentials" })).toBe(
      MENSAGENS_AUTH_CLIENTE.credenciaisInvalidas
    );
  });

  it("senha recusada pelo Supabase", () => {
    expect(traduzirErroAuthCliente({ code: "weak_password", message: "Password should be at least 6 characters" })).toBe(
      MENSAGENS_AUTH_CLIENTE.senhaFraca
    );
  });

  it("limite de tentativas e falha de rede", () => {
    expect(traduzirErroAuthCliente({ status: 429, message: "rate limit" })).toBe(MENSAGENS_AUTH_CLIENTE.muitasTentativas);
    expect(traduzirErroAuthCliente({ name: "AuthRetryableFetchError", message: "Failed to fetch" })).toBe(
      MENSAGENS_AUTH_CLIENTE.falhaConexao
    );
  });

  it("erro desconhecido vira mensagem genérica", () => {
    expect(traduzirErroAuthCliente({ message: "algo" })).toBe(MENSAGENS_AUTH_CLIENTE.erroGenerico);
    expect(traduzirErroAuthCliente(undefined)).toBe(MENSAGENS_AUTH_CLIENTE.erroGenerico);
  });
});
