import { describe, it, expect } from "vitest";
import {
  MENSAGENS_LOGIN_ADMIN,
  traduzirErroLoginAdmin,
  validarCredenciaisAdmin,
} from "@/lib/adminAuth/regras";

// Spec: SPEC/2026-11-18-login-real-admin.md

describe("validarCredenciaisAdmin", () => {
  it("aceita e-mail e senha preenchidos", () => {
    expect(validarCredenciaisAdmin("admin@complexo.com", "SenhaForte1!")).toBeNull();
  });

  it("ignora espaços nas pontas do e-mail", () => {
    expect(validarCredenciaisAdmin("  admin@complexo.com  ", "x")).toBeNull();
  });

  it("exige e-mail", () => {
    expect(validarCredenciaisAdmin("   ", "senha")).toBe(MENSAGENS_LOGIN_ADMIN.emailObrigatorio);
  });

  it("rejeita e-mail malformado", () => {
    expect(validarCredenciaisAdmin("admin@", "senha")).toBe(MENSAGENS_LOGIN_ADMIN.emailInvalido);
    expect(validarCredenciaisAdmin("admin.com", "senha")).toBe(MENSAGENS_LOGIN_ADMIN.emailInvalido);
  });

  it("exige senha", () => {
    expect(validarCredenciaisAdmin("admin@complexo.com", "")).toBe(MENSAGENS_LOGIN_ADMIN.senhaObrigatoria);
  });
});

describe("traduzirErroLoginAdmin", () => {
  it("credenciais inválidas não revelam se o e-mail existe", () => {
    expect(
      traduzirErroLoginAdmin({ message: "Invalid login credentials", status: 400, code: "invalid_credentials" })
    ).toBe(MENSAGENS_LOGIN_ADMIN.credenciaisInvalidas);
  });

  it("e-mail não confirmado vira credenciais inválidas", () => {
    expect(traduzirErroLoginAdmin({ message: "Email not confirmed", code: "email_not_confirmed" })).toBe(
      MENSAGENS_LOGIN_ADMIN.credenciaisInvalidas
    );
  });

  it("limite de tentativas", () => {
    expect(traduzirErroLoginAdmin({ message: "Request rate limit reached", status: 429 })).toBe(
      MENSAGENS_LOGIN_ADMIN.muitasTentativas
    );
  });

  it("falha de rede", () => {
    expect(traduzirErroLoginAdmin({ name: "AuthRetryableFetchError", message: "Failed to fetch", status: 0 })).toBe(
      MENSAGENS_LOGIN_ADMIN.falhaConexao
    );
    expect(traduzirErroLoginAdmin(new TypeError("Failed to fetch"))).toBe(MENSAGENS_LOGIN_ADMIN.falhaConexao);
  });

  it("erro desconhecido usa mensagem genérica", () => {
    expect(traduzirErroLoginAdmin({ message: "algo estranho", status: 500 })).toBe(MENSAGENS_LOGIN_ADMIN.erroGenerico);
    expect(traduzirErroLoginAdmin(null)).toBe(MENSAGENS_LOGIN_ADMIN.erroGenerico);
  });
});
