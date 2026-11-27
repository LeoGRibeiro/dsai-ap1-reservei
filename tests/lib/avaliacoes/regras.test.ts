import { describe, it, expect } from "vitest";
import {
  MENSAGENS_AVALIACOES,
  fimDoJogo,
  reservaAvaliavel,
  resumoAvaliacoes,
  traduzirErroAvaliacao,
  urlAvaliacaoGoogle,
  validarAvaliacao,
} from "@/lib/avaliacoes/regras";
import type { AvaliacaoPublica } from "@/lib/avaliacoes/types";
import type { Reserva } from "@/store/useReservasStore";

// Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md

const reserva = (parcial: Partial<Reserva> = {}): Reserva => ({
  id: "r1", quadraId: "q1", nomeCliente: "Ana", whatsappCliente: "91900000001", cpfCliente: "",
  data: "2026-11-20", horarios: ["18:00", "19:00"], horaInicio: "18:00", horaFim: "20:00",
  valorTotal: 200, valorSinal: 80, valorPendente: 120, status: "confirmada", statusWhatsApp: "nao_enviado",
  criadaEm: "2026-11-01T10:00:00Z", tipoReserva: "avulsa", ...parcial,
});

// 20:00 em Belém (UTC-3) = 23:00 UTC.
const FIM = new Date("2026-11-20T23:00:00Z");
const depois = (ms: number) => new Date(FIM.getTime() + ms);
const DIA = 24 * 60 * 60 * 1000;

describe("fimDoJogo", () => {
  it("usa a data e a hora de fim no fuso de Belém", () => {
    expect(fimDoJogo(reserva())).toEqual(FIM);
  });

  it("24:00 é a meia-noite do dia seguinte", () => {
    expect(fimDoJogo(reserva({ horaFim: "24:00" }))).toEqual(new Date("2026-11-21T03:00:00Z"));
  });
});

describe("reservaAvaliavel", () => {
  it("só depois que o jogo termina", () => {
    expect(reservaAvaliavel(reserva(), depois(-1))).toBe(false);
    expect(reservaAvaliavel(reserva(), FIM)).toBe(true);
  });

  it("até 30 dias depois do fim do jogo", () => {
    expect(reservaAvaliavel(reserva(), depois(30 * DIA))).toBe(true);
    expect(reservaAvaliavel(reserva(), depois(30 * DIA + 1))).toBe(false);
  });

  it("sinal pago (pendente) também vale; cancelada e provisória não", () => {
    expect(reservaAvaliavel(reserva({ status: "pendente" }), FIM)).toBe(true);
    expect(reservaAvaliavel(reserva({ status: "cancelada" }), FIM)).toBe(false);
    expect(reservaAvaliavel(reserva({ status: "em_processamento" }), FIM)).toBe(false);
  });

  it("grupo e reserva manual valem; bloqueio e escolinha não", () => {
    expect(reservaAvaliavel(reserva({ tipoReserva: "grupo" }), FIM)).toBe(true);
    expect(reservaAvaliavel(reserva({ tipoReserva: "admin_manual" }), FIM)).toBe(true);
    expect(reservaAvaliavel(reserva({ tipoReserva: undefined }), FIM)).toBe(true);
    expect(reservaAvaliavel(reserva({ tipoReserva: "manutencao_bloqueio" }), FIM)).toBe(false);
    expect(reservaAvaliavel(reserva({ tipoReserva: "escolinha" }), FIM)).toBe(false);
  });
});

describe("validarAvaliacao", () => {
  it("nota inteira de 1 a 5", () => {
    expect(validarAvaliacao({ nota: 0, comentario: "" })).toBe(MENSAGENS_AVALIACOES.notaInvalida);
    expect(validarAvaliacao({ nota: 6, comentario: "" })).toBe(MENSAGENS_AVALIACOES.notaInvalida);
    expect(validarAvaliacao({ nota: 4.5, comentario: "" })).toBe(MENSAGENS_AVALIACOES.notaInvalida);
    expect(validarAvaliacao({ nota: 1, comentario: "" })).toBeNull();
    expect(validarAvaliacao({ nota: 5, comentario: "" })).toBeNull();
  });

  it("comentário até 500 caracteres, sem contar os espaços nas pontas", () => {
    expect(validarAvaliacao({ nota: 5, comentario: `  ${"a".repeat(500)}  ` })).toBeNull();
    expect(validarAvaliacao({ nota: 5, comentario: "a".repeat(501) })).toBe(MENSAGENS_AVALIACOES.comentarioLongo);
  });
});

describe("resumoAvaliacoes", () => {
  const av = (id: string, nota: number, criadaEm: string): AvaliacaoPublica => ({
    id, nota, comentario: null, nomeExibicao: "Ana S.", criadaEm,
  });

  it("sem avaliações não há média", () => {
    expect(resumoAvaliacoes([])).toEqual({ media: null, total: 0, recentes: [] });
  });

  it("média com uma casa e as 6 mais recentes", () => {
    const lista = [5, 4, 4, 5, 3, 5, 4].map((n, i) => av(`a${i}`, n, `2026-11-0${i + 1}T10:00:00Z`));
    const resumo = resumoAvaliacoes(lista);
    expect(resumo.media).toBe(4.3);
    expect(resumo.total).toBe(7);
    expect(resumo.recentes.map((a) => a.id)).toEqual(["a6", "a5", "a4", "a3", "a2", "a1"]);
  });
});

describe("urlAvaliacaoGoogle", () => {
  it("aceita só endereço https", () => {
    expect(urlAvaliacaoGoogle(" https://g.page/r/abc/review ")).toBe("https://g.page/r/abc/review");
    expect(urlAvaliacaoGoogle("http://g.page/r/abc")).toBeNull();
    expect(urlAvaliacaoGoogle("javascript:alert(1)")).toBeNull();
    expect(urlAvaliacaoGoogle("")).toBeNull();
    expect(urlAvaliacaoGoogle(undefined)).toBeNull();
  });
});

describe("traduzirErroAvaliacao", () => {
  it("traduz os códigos do banco", () => {
    expect(traduzirErroAvaliacao({ message: "avaliacao_nao_permitida" })).toBe(MENSAGENS_AVALIACOES.avaliacao_nao_permitida);
    expect(traduzirErroAvaliacao({ message: "prazo_avaliacao_encerrado" })).toBe(MENSAGENS_AVALIACOES.prazo_avaliacao_encerrado);
    expect(traduzirErroAvaliacao({ message: "avaliacao_travada" })).toBe(MENSAGENS_AVALIACOES.avaliacao_travada);
    expect(traduzirErroAvaliacao({ message: "usuario_bloqueado" })).toBe(MENSAGENS_AVALIACOES.usuario_bloqueado);
    expect(traduzirErroAvaliacao({ message: 'duplicate key value violates unique constraint "uq_avaliacoes_reserva"' }))
      .toBe(MENSAGENS_AVALIACOES.avaliacao_ja_enviada);
  });

  it("erro desconhecido vira mensagem genérica", () => {
    expect(traduzirErroAvaliacao(new Error("rede caiu"))).toBe(MENSAGENS_AVALIACOES.erroGenerico);
    expect(traduzirErroAvaliacao(null)).toBe(MENSAGENS_AVALIACOES.erroGenerico);
  });
});
