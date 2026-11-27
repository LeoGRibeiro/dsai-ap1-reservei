import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Evento } from "@/lib/eventos/types";

// Spec: SPEC/2026-11-27-eventos-e-torneios.md

const { estado } = vi.hoisted(() => ({
  estado: {
    proximos: [] as Evento[],
    ultimoEncerrado: null as Evento | null,
    nomeCampeao: null as string | null,
    carregando: false,
  },
}));

vi.mock("@/hooks/useEventosService", () => ({ useEventosLanding: () => estado }));

import { SecaoEventos } from "@/components/landing/SecaoEventos";

const evento = (parcial: Partial<Evento>): Evento => ({
  id: "ev1",
  tipo: "torneio",
  nome: "Copa Reservei",
  data: "2026-12-05",
  horaInicio: "18:00",
  horaFim: "22:00",
  valorInscricao: 120,
  maxTimes: 8,
  status: "publicado",
  reservasBloqueio: [],
  ...parcial,
});

describe("SecaoEventos", () => {
  beforeEach(() => {
    estado.proximos = [];
    estado.ultimoEncerrado = null;
    estado.nomeCampeao = null;
    estado.carregando = false;
  });

  it("não mostra mais o selo de seção em construção", () => {
    render(<SecaoEventos />);
    expect(screen.queryByText("Em construção")).toBeNull();
    expect(screen.getByText(/Nenhum evento programado/)).toBeInTheDocument();
  });

  it("card do torneio leva à página do evento e informa que a inscrição é paga no local", () => {
    estado.proximos = [evento({})];
    render(<SecaoEventos />);
    expect(screen.getByRole("heading", { name: "Copa Reservei" })).toBeInTheDocument();
    expect(screen.getByText(/pago no local/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver torneio e inscrição" })).toHaveAttribute("href", "/eventos/ev1");
  });

  it("evento social gratuito", () => {
    estado.proximos = [evento({ id: "ev2", tipo: "social", nome: "Festa", valorInscricao: 0 })];
    render(<SecaoEventos />);
    expect(screen.getByText("Participação gratuita")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver detalhes" })).toHaveAttribute("href", "/eventos/ev2");
  });

  it("mostra o último campeão", () => {
    estado.ultimoEncerrado = evento({ status: "encerrado", nome: "Copa de Outubro" });
    estado.nomeCampeao = "Leões";
    render(<SecaoEventos />);
    expect(screen.getByText("Leões")).toBeInTheDocument();
    expect(screen.getByText(/Copa de Outubro/)).toBeInTheDocument();
  });
});
