import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FormularioIdentificacao } from "@/components/portal/FormularioIdentificacao";

// Spec: SPEC/2026-11-17-fundacao-qualidade.md
// Cobre a correção do lint react-hooks/immutability: o formulário não pode
// mais alterar o objeto de estado `dados` ao confirmar com cliente logado.

type UsuarioMock = { id: string; nome: string; telefone: string; bloqueado?: boolean } | null;
let mockUser: UsuarioMock = null;

vi.mock("@/hooks/useUserAuth", () => ({
  useUserAuth: () => ({
    user: mockUser,
    isAutenticado: Boolean(mockUser),
    loading: false,
    hasHydrated: true,
  }),
}));

vi.mock("@/lib/supabase/authService", () => ({
  isTelefoneBloqueado: vi.fn().mockResolvedValue(false),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderFormulario(onConfirmar = vi.fn()) {
  render(
    <FormularioIdentificacao
      open
      onClose={vi.fn()}
      onConfirmar={onConfirmar}
      quadraId="q1"
      data="2099-01-10"
      horariosSelecionados={["18:00"]}
      valorTotal={110}
      valorSinal={44}
      valorPendente={66}
    />
  );
  return onConfirmar;
}

describe("FormularioIdentificacao - confirmação dos dados", () => {
  beforeEach(() => {
    mockUser = null;
    vi.clearAllMocks();
  });

  it("envia nome e WhatsApp da conta quando o cliente está logado", async () => {
    mockUser = { id: "usr_1", nome: "Maria Souza", telefone: "(91) 98888-7777" };
    const onConfirmar = renderFormulario();

    fireEvent.click(screen.getByRole("button", { name: /Ir para pagamento Pix/i }));

    await waitFor(() => expect(onConfirmar).toHaveBeenCalledTimes(1));
    const [dados, tipoPagamento] = onConfirmar.mock.calls[0];
    expect(dados.nome).toBe("Maria Souza");
    expect(dados.whatsapp).toBe("(91) 98888-7777");
    expect(tipoPagamento).toBe("sinal");
  });

  it("não chama onConfirmar para visitante sem nome e WhatsApp válidos", async () => {
    const onConfirmar = renderFormulario();

    fireEvent.click(screen.getByRole("button", { name: /Ir para pagamento Pix/i }));

    await waitFor(() => expect(screen.getByText("Informe seu nome completo.")).toBeTruthy());
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
