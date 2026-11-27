import { describe, it, expect } from "vitest";
import {
  MENSAGENS_EVENTOS,
  eventosParaLanding,
  horariosDoEvento,
  situacaoInscricao,
  traduzirErroEvento,
  validarEvento,
  validarNomeTime,
} from "@/lib/eventos/regras";
import type { Evento } from "@/lib/eventos/types";

// Spec: SPEC/2026-11-27-eventos-e-torneios.md

const HOJE = "2026-11-27";

function evento(parcial: Partial<Evento> = {}): Evento {
  return {
    id: "ev1",
    tipo: "torneio",
    nome: "Copa Reservei",
    data: "2026-12-05",
    horaInicio: "18:00",
    horaFim: "22:00",
    quadraId: "q1",
    valorInscricao: 120,
    maxTimes: 8,
    inscricoesAte: "2026-12-03",
    status: "publicado",
    reservasBloqueio: [],
    ...parcial,
  };
}

describe("validarEvento", () => {
  it("evento completo é válido", () => {
    expect(validarEvento(evento(), HOJE)).toEqual([]);
  });

  it("nome curto, data passada e horário invertido", () => {
    const erros = validarEvento(evento({ nome: "Ab", data: "2026-11-26", horaInicio: "20:00", horaFim: "19:00" }), HOJE);
    expect(erros).toEqual(expect.arrayContaining([
      MENSAGENS_EVENTOS.nomeInvalido,
      MENSAGENS_EVENTOS.dataPassada,
      MENSAGENS_EVENTOS.horarioInvalido,
    ]));
  });

  it("horário fora do funcionamento ou quebrado", () => {
    expect(validarEvento(evento({ horaInicio: "07:00" }), HOJE)).toContain(MENSAGENS_EVENTOS.horarioInvalido);
    expect(validarEvento(evento({ horaFim: "23:00" }), HOJE)).toContain(MENSAGENS_EVENTOS.horarioInvalido);
    expect(validarEvento(evento({ horaInicio: "18:30" }), HOJE)).toContain(MENSAGENS_EVENTOS.horarioInvalido);
  });

  it("torneio exige 4, 8 ou 16 times e prazo até a data do evento", () => {
    expect(validarEvento(evento({ maxTimes: undefined }), HOJE)).toContain(MENSAGENS_EVENTOS.maxTimesInvalido);
    expect(validarEvento(evento({ inscricoesAte: "2026-12-06" }), HOJE)).toContain(MENSAGENS_EVENTOS.prazoDepoisDoEvento);
  });

  it("evento social não precisa de times nem prazo", () => {
    expect(validarEvento(evento({ tipo: "social", maxTimes: undefined, inscricoesAte: undefined }), HOJE)).toEqual([]);
  });

  it("valor de inscrição negativo é recusado", () => {
    expect(validarEvento(evento({ valorInscricao: -1 }), HOJE)).toContain(MENSAGENS_EVENTOS.valorInvalido);
  });
});

describe("validarNomeTime", () => {
  it("aceita 3 a 40 caracteres, ignorando espaços nas pontas", () => {
    expect(validarNomeTime("  Leões  ")).toBeNull();
    expect(validarNomeTime(" ab ")).toBe(MENSAGENS_EVENTOS.nomeTimeInvalido);
    expect(validarNomeTime("x".repeat(41))).toBe(MENSAGENS_EVENTOS.nomeTimeInvalido);
  });
});

describe("situacaoInscricao", () => {
  it("aberta com evento publicado, no prazo e com vaga", () => {
    expect(situacaoInscricao(evento(), 3, HOJE)).toEqual({ aberta: true, vagasRestantes: 5 });
  });

  it("último dia do prazo ainda aceita", () => {
    expect(situacaoInscricao(evento({ inscricoesAte: HOJE }), 0, HOJE).aberta).toBe(true);
  });

  it.each([
    ["prazo vencido", evento({ inscricoesAte: "2026-11-26" }), 0, MENSAGENS_EVENTOS.inscricoes_encerradas],
    ["vagas esgotadas", evento({ maxTimes: 4 }), 4, MENSAGENS_EVENTOS.vagas_esgotadas],
    ["chave sorteada", evento({ status: "chave_sorteada" }), 2, MENSAGENS_EVENTOS.inscricoes_encerradas],
    ["cancelado", evento({ status: "cancelado" }), 0, MENSAGENS_EVENTOS.eventoCancelado],
    ["evento social", evento({ tipo: "social" }), 0, MENSAGENS_EVENTOS.semInscricao],
  ])("fechada: %s", (_caso, ev, inscritos, motivo) => {
    expect(situacaoInscricao(ev, inscritos, HOJE)).toMatchObject({ aberta: false, motivo });
  });
});

describe("horariosDoEvento", () => {
  it("lista as horas cheias do início até antes do fim", () => {
    expect(horariosDoEvento(evento())).toEqual(["18:00", "19:00", "20:00", "21:00"]);
  });
});

describe("eventosParaLanding", () => {
  it("próximos publicados em ordem de data e último encerrado", () => {
    const lista = [
      evento({ id: "b", data: "2026-12-10" }),
      evento({ id: "a", data: "2026-12-01", status: "chave_sorteada" }),
      evento({ id: "rasc", status: "rascunho" }),
      evento({ id: "canc", status: "cancelado" }),
      evento({ id: "passado", data: "2026-11-20" }),
      evento({ id: "enc1", data: "2026-11-10", status: "encerrado" }),
      evento({ id: "enc2", data: "2026-11-20", status: "encerrado" }),
    ];

    const { proximos, ultimoEncerrado } = eventosParaLanding(lista, HOJE);
    expect(proximos.map((e) => e.id)).toEqual(["a", "b"]);
    expect(ultimoEncerrado?.id).toBe("enc2");
  });

  it("sem eventos", () => {
    expect(eventosParaLanding([], HOJE)).toEqual({ proximos: [], ultimoEncerrado: null });
  });
});

describe("traduzirErroEvento", () => {
  it.each([
    ["inscricoes_encerradas", MENSAGENS_EVENTOS.inscricoes_encerradas],
    ["vagas_esgotadas", MENSAGENS_EVENTOS.vagas_esgotadas],
    ["conta_necessaria", MENSAGENS_EVENTOS.conta_necessaria],
    ["usuario_bloqueado", MENSAGENS_EVENTOS.usuario_bloqueado],
    ['duplicate key value violates unique constraint "uq_eventos_inscricoes_usuario"', MENSAGENS_EVENTOS.time_ja_inscrito],
    ['duplicate key value violates unique constraint "uq_eventos_inscricoes_nome_time"', MENSAGENS_EVENTOS.nome_time_em_uso],
    ["horario_ocupado", MENSAGENS_EVENTOS.horario_ocupado],
    ["Failed to fetch", MENSAGENS_EVENTOS.erroGenerico],
  ])("%s", (message, esperado) => {
    expect(traduzirErroEvento({ message })).toBe(esperado);
  });

  it("erros da chave (lançados pelas regras) também viram mensagem", () => {
    expect(traduzirErroEvento(new Error("empate_exige_penaltis"))).toBe(MENSAGENS_EVENTOS.empate_exige_penaltis);
    expect(traduzirErroEvento(new Error("proxima_partida_ja_jogada"))).toBe(MENSAGENS_EVENTOS.proxima_partida_ja_jogada);
  });
});
