import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminLogin } from "@/components/admin/AdminLogin";

// Spec: SPEC/2026-11-18-login-real-admin.md

function preencher(email: string, senha: string) {
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: senha } });
}

describe("AdminLogin", () => {
  it("envia e-mail e senha para o login", async () => {
    const onLogin = vi.fn().mockResolvedValue({ ok: true });
    render(<AdminLogin onLogin={onLogin} />);

    preencher("admin@complexo.com", "Senha1!");
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith("admin@complexo.com", "Senha1!"));
  });

  it("mostra a mensagem de erro devolvida pelo login e limpa a senha", async () => {
    const onLogin = vi.fn().mockResolvedValue({ ok: false, erro: "Esta conta não tem acesso ao painel administrativo." });
    render(<AdminLogin onLogin={onLogin} />);

    preencher("cliente@x.com", "Senha1!");
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Esta conta não tem acesso ao painel administrativo.")).toBeTruthy();
    expect((screen.getByLabelText("Senha") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("E-mail") as HTMLInputElement).value).toBe("cliente@x.com");
  });

  it("não envia sem e-mail e senha", () => {
    const onLogin = vi.fn();
    render(<AdminLogin onLogin={onLogin} />);
    expect((screen.getByRole("button", { name: "Entrar" }) as HTMLButtonElement).disabled).toBe(true);
    preencher("admin@complexo.com", "");
    expect((screen.getByRole("button", { name: "Entrar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("não exibe mais a senha fixa antiga", () => {
    const { container } = render(<AdminLogin onLogin={vi.fn()} />);
    expect(container.innerHTML).not.toContain("admin123");
  });
});
