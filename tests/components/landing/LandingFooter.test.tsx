import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingFooter, MENSAGEM_WHATSAPP_RODAPE } from "@/components/landing/LandingFooter";
import { SITE_CONFIG } from "@/lib/landingPage/siteConfig";
import type { ConfiguracaoSite } from "@/lib/landingPage/types";

describe("LandingFooter - Componente", () => {
  let scrollToSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exibe o slogan e a assinatura da plataforma", () => {
    render(<LandingFooter />);
    expect(screen.getByText(SITE_CONFIG.slogan)).toBeInTheDocument();
    expect(screen.getByText(/Reservas online por/)).toBeInTheDocument();
  });

  it("exibe o ano de copyright com base na data informada", () => {
    render(<LandingFooter agora={new Date(2031, 5, 10)} />);
    expect(screen.getByText(/© 2031/)).toBeInTheDocument();
  });

  it("renderiza links de redes sociais acessíveis que abrem em nova aba com segurança", () => {
    render(<LandingFooter />);
    const lista = screen.getByRole("list", { name: "Redes sociais" });
    const links = within(lista).getAllByRole("link");

    expect(links).toHaveLength(SITE_CONFIG.redesSociais.length);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveAttribute("aria-label");
    }
    expect(screen.getByLabelText("Instagram")).toHaveAttribute("href", "https://www.instagram.com/");
  });

  it("renderiza os links rápidos de navegação do rodapé", () => {
    render(<LandingFooter />);
    const nav = screen.getByRole("navigation", { name: "Navegação do rodapé" });
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Início",
      "Estrutura",
      "Escolinhas",
      "Eventos",
      "Contato",
    ]);
  });

  it("rola até a seção ao clicar em um link do rodapé", () => {
    render(
      <>
        <section id="inicio" />
        <LandingFooter />
      </>
    );
    fireEvent.click(document.getElementById("nav-rodape-inicio") as HTMLElement);
    expect(scrollToSpy).toHaveBeenCalled();
    expect(window.location.hash).toBe("#inicio");
  });

  it("monta o atalho de WhatsApp com mensagem pré-preenchida", () => {
    render(<LandingFooter />);
    const link = document.getElementById("rodape-whatsapp");
    expect(link).toHaveAttribute(
      "href",
      `https://wa.me/${SITE_CONFIG.whatsappNumero}?text=${encodeURIComponent(MENSAGEM_WHATSAPP_RODAPE)}`
    );
  });

  it("exibe mensagem alternativa quando o WhatsApp configurado é inválido", () => {
    const config: ConfiguracaoSite = { ...SITE_CONFIG, whatsappNumero: "123" };
    render(<LandingFooter config={config} />);
    expect(document.getElementById("rodape-whatsapp")).toBeNull();
    expect(screen.getByText("Canais de atendimento em breve.")).toBeInTheDocument();
  });

  it("não renderiza ícones quando não há redes sociais configuradas", () => {
    const config: ConfiguracaoSite = { ...SITE_CONFIG, redesSociais: [] };
    render(<LandingFooter config={config} />);
    const lista = screen.getByRole("list", { name: "Redes sociais" });
    expect(within(lista).queryAllByRole("link")).toHaveLength(0);
  });
});
