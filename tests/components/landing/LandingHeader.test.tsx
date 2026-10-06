import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingHeader } from "@/components/landing/LandingHeader";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

let mockUserAuth: { user: { id: string; nome: string; telefone: string } | null } = { user: null };

vi.mock("@/hooks/useUserAuth", () => ({
  useUserAuth: () => mockUserAuth,
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const SECOES_DOM = ["inicio", "estrutura", "escolinhas", "eventos", "contato"];

function renderizarPagina() {
  return render(
    <>
      <LandingHeader />
      {SECOES_DOM.map((id) => (
        <section key={id} id={id} />
      ))}
    </>
  );
}

function definirScrollY(valor: number) {
  Object.defineProperty(window, "scrollY", { value: valor, writable: true, configurable: true });
}

describe("LandingHeader - Componente", () => {
  let scrollToSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUserAuth = { user: null };
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    definirScrollY(0);
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza os links de navegação definidos na spec com âncoras corretas", () => {
    renderizarPagina();
    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    const links = within(nav).getAllByRole("link");

    expect(links.map((l) => l.textContent)).toEqual([
      "Início",
      "Estrutura",
      "Escolinhas",
      "Eventos",
      "Contato",
    ]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "#inicio",
      "#estrutura",
      "#escolinhas",
      "#eventos",
      "#contato",
    ]);
  });

  it("destaca a primeira seção (reserva) como ativa por padrão", () => {
    renderizarPagina();
    expect(document.getElementById("nav-desktop-inicio")).toHaveAttribute("aria-current", "location");
    expect(document.getElementById("nav-desktop-estrutura")).not.toHaveAttribute("aria-current");
  });

  it("exibe Entrar e Criar Conta para visitantes", () => {
    renderizarPagina();
    expect(screen.getByText("Entrar")).toBeInTheDocument();
    expect(screen.getByText("Criar Conta")).toBeInTheDocument();
    expect(document.getElementById("header-entrar")).toHaveAttribute("href", "/login");
    expect(document.getElementById("header-criar-conta")).toHaveAttribute("href", "/cadastro");
  });

  it("exibe o primeiro nome e o atalho de Minhas Reservas para cliente logado", () => {
    mockUserAuth = { user: { id: "u1", nome: "Leonardo Ribeiro", telefone: "11999998888" } };
    renderizarPagina();

    expect(screen.getByText("Leonardo")).toBeInTheDocument();
    expect(screen.getByText("Minhas Reservas")).toBeInTheDocument();
    expect(document.getElementById("header-minha-conta")).toHaveAttribute("href", "/minha-conta");
    expect(screen.queryByText("Entrar")).not.toBeInTheDocument();
  });

  it("rola suavemente até a seção ao clicar em um link do menu", () => {
    renderizarPagina();
    fireEvent.click(document.getElementById("nav-desktop-estrutura") as HTMLElement);

    expect(scrollToSpy).toHaveBeenCalled();
    expect(window.location.hash).toBe("#estrutura");
  });

  it("não intercepta Ctrl+Clique (permite abrir em nova aba)", () => {
    renderizarPagina();
    fireEvent.click(document.getElementById("nav-desktop-contato") as HTMLElement, { ctrlKey: true });
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("CTA 'Agendar Agora' leva ao fluxo de reserva", () => {
    renderizarPagina();
    fireEvent.click(document.getElementById("header-agendar-agora") as HTMLElement);
    expect(scrollToSpy).toHaveBeenCalled();
    expect(window.location.hash).toBe("#inicio");
  });

  it("clicar no logo leva ao início", () => {
    renderizarPagina();
    fireEvent.click(screen.getByLabelText("Ir para o início"));
    expect(scrollToSpy).toHaveBeenCalled();
    expect(window.location.hash).toBe("#inicio");
  });

  it("fica transparente no topo e sólido após rolar", () => {
    const { container } = renderizarPagina();
    const header = container.querySelector("header") as HTMLElement;
    expect(header).toHaveAttribute("data-rolado", "false");

    definirScrollY(300);
    fireEvent.scroll(window);
    expect(header).toHaveAttribute("data-rolado", "true");
  });

  it("menu mobile abre, navega e fecha antes de rolar", async () => {
    renderizarPagina();
    const botaoMenu = screen.getByLabelText("Abrir menu de navegação");
    expect(botaoMenu).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(botaoMenu);
    expect(botaoMenu).toHaveAttribute("aria-expanded", "true");

    const linkMobile = await waitFor(() => {
      const el = document.getElementById("nav-mobile-eventos");
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });

    fireEvent.click(linkMobile);
    expect(botaoMenu).toHaveAttribute("aria-expanded", "false");

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalled();
    });
    expect(window.location.hash).toBe("#eventos");
  });
});
