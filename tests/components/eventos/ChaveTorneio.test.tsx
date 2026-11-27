import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChaveTorneio } from "@/components/eventos/ChaveTorneio";
import { gerarChave, registrarResultado } from "@/lib/eventos/chave";

// Spec: SPEC/2026-11-27-eventos-e-torneios.md

const nomes = { t1: "Leões", t2: "Tigres", t3: "Águias" };

describe("ChaveTorneio", () => {
  it("mostra as rodadas pelo nome e o time que avançou sem jogar", () => {
    render(<ChaveTorneio partidas={gerarChave("ev", ["t1", "t2", "t3"])} nomes={nomes} />);
    expect(screen.getByRole("region", { name: "Semifinal" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Final" })).toBeInTheDocument();
    expect(screen.getByText("Avançou sem jogar")).toBeInTheDocument();
    expect(screen.queryByText("Salvar placar")).toBeNull();
  });

  it("sem partidas avisa que a chave não foi sorteada", () => {
    render(<ChaveTorneio partidas={[]} nomes={{}} />);
    expect(screen.getByText(/ainda não foi sorteada/)).toBeInTheDocument();
  });

  it("admin lança o placar", () => {
    const onLancar = vi.fn();
    render(<ChaveTorneio partidas={gerarChave("ev", ["t1", "t2"])} nomes={nomes} onLancar={onLancar} />);
    fireEvent.change(screen.getByLabelText("Gols de Leões"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Gols de Tigres"), { target: { value: "1" } });
    fireEvent.click(screen.getByText("Salvar placar"));
    expect(onLancar).toHaveBeenCalledWith("ev_r1_p0", { golsA: 3, golsB: 1 });
  });

  it("placar empatado pede o vencedor nos pênaltis", () => {
    const onLancar = vi.fn();
    render(<ChaveTorneio partidas={gerarChave("ev", ["t1", "t2"])} nomes={nomes} onLancar={onLancar} />);
    expect(screen.queryByLabelText("Vencedor nos pênaltis")).toBeNull();
    fireEvent.change(screen.getByLabelText("Gols de Leões"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Gols de Tigres"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Vencedor nos pênaltis"), { target: { value: "b" } });
    fireEvent.click(screen.getByText("Salvar placar"));
    expect(onLancar).toHaveBeenCalledWith("ev_r1_p0", { golsA: 2, golsB: 2, vencedorPenaltis: "b" });
  });

  it("W.O. e desfazer chamam o admin com a ação certa", () => {
    const onLancar = vi.fn();
    const jogada = registrarResultado(gerarChave("ev", ["t1", "t2"]), "ev_r1_p0", { golsA: 1, golsB: 0 });
    render(<ChaveTorneio partidas={jogada} nomes={nomes} onLancar={onLancar} />);
    fireEvent.click(screen.getByText("W.O. de Tigres"));
    expect(onLancar).toHaveBeenCalledWith("ev_r1_p0", { woDe: "b" });
    fireEvent.click(screen.getByText("Desfazer"));
    expect(onLancar).toHaveBeenCalledWith("ev_r1_p0", "desfazer");
  });
});
