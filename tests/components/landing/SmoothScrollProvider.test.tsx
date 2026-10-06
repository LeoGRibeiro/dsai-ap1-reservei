import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SmoothScrollProvider } from "@/components/landing/SmoothScrollProvider";

describe("SmoothScrollProvider - Componente", () => {
  it("renderiza os elementos filhos corretamente sem erros", () => {
    render(
      <SmoothScrollProvider>
        <div data-testid="conteudo-filho">Conteudo da Landing Page</div>
      </SmoothScrollProvider>
    );

    expect(screen.getByTestId("conteudo-filho")).toBeInTheDocument();
    expect(screen.getByText("Conteudo da Landing Page")).toBeInTheDocument();
  });

  it("permite montagem e desmontagem limpa", () => {
    const { unmount } = render(
      <SmoothScrollProvider>
        <span>Teste de desmontagem</span>
      </SmoothScrollProvider>
    );

    expect(() => unmount()).not.toThrow();
  });
});
