/**
 * Testes Unitários de Regras de Negócio e Serviços do Sistema de Fidelidade.
 * Conforme especificações em SPEC/2026-10-05-sistema-fidelidade.md.
 */

import { describe, it, expect } from "vitest";
import {
  isDataExpirada,
  isReservaAvulsa,
  isPartidaConcluida,
  avaliarElegibilidadeReservaParaSelo,
  construirSeloParaReserva,
  calcularTicketMedio,
  calcularProgressoUsuario,
  resgatarVoucherFidelidade,
  aplicarDescontoVoucher,
  aplicarDescontoVouchers,
  CAMPANHA_PADRAO,
} from "@/lib/fidelidade/fidelidadeService";
import type { Reserva } from "@/store/useReservasStore";
import type {
  CampanhaFidelidade,
  SeloFidelidade,
  VoucherFidelidade,
} from "@/lib/fidelidade/types";

describe("fidelidadeService - Regras de Domínio e Validações", () => {
  const campanhaTeste: CampanhaFidelidade = {
    ...CAMPANHA_PADRAO,
    horasNecessarias: 12,
    mesesValidade: 3,
    diasValidadeVoucher: 60,
  };

  const reservaBase: Reserva = {
    id: "rsv_123",
    quadraId: "1",
    userId: "usr_joao",
    nomeCliente: "João Silva",
    whatsappCliente: "11988887777",
    cpfCliente: "12345678900",
    data: "2026-05-10",
    horarios: ["18:00"],
    horaInicio: "18:00",
    horaFim: "19:00",
    valorTotal: 100,
    valorSinal: 40,
    valorPendente: 60,
    status: "confirmada",
    statusWhatsApp: "enviado",
    criadaEm: "2026-05-10T10:00:00.000Z",
  };

  // ── 1. Validação de Avulsa vs Recorrente ───────────────────────────────────

  describe("isReservaAvulsa", () => {
    it("retorna true para reserva sem contratoId e sem tipo especial", () => {
      expect(isReservaAvulsa(reservaBase)).toBe(true);
    });

    it("retorna false quando a reserva possui contratoId vinculado", () => {
      const recorrente: Reserva = {
        ...reservaBase,
        contratoId: "ctr_escolinha_01",
      };
      expect(isReservaAvulsa(recorrente)).toBe(false);
    });

    it("retorna false quando o tipoReserva é escolinha", () => {
      const escolinha: Reserva = {
        ...reservaBase,
        tipoReserva: "escolinha",
      };
      expect(isReservaAvulsa(escolinha)).toBe(false);
    });

    it("retorna false quando o tipoReserva é grupo de mensalista", () => {
      const grupo: Reserva = {
        ...reservaBase,
        tipoReserva: "grupo",
      };
      expect(isReservaAvulsa(grupo)).toBe(false);
    });
  });

  // ── 2. Validação de Jogo Concluído (Prevenção de Fraude) ──────────────────

  describe("isPartidaConcluida", () => {
    it("retorna true quando o momento atual é posterior ao horário final do jogo", () => {
      const momentoAtual = new Date("2026-05-10T19:30:00.000Z");
      expect(isPartidaConcluida(reservaBase, momentoAtual)).toBe(true);
    });

    it("retorna false se o jogo estiver no futuro", () => {
      const momentoFuturo = new Date("2026-05-10T17:00:00.000Z");
      expect(isPartidaConcluida(reservaBase, momentoFuturo)).toBe(false);
    });

    it("retorna false se a reserva estiver cancelada, mesmo no passado", () => {
      const cancelada: Reserva = {
        ...reservaBase,
        status: "cancelada",
      };
      const momentoAtual = new Date("2026-05-10T22:00:00.000Z");
      expect(isPartidaConcluida(cancelada, momentoAtual)).toBe(false);
    });
  });

  // ── 3. Elegibilidade para Geração de Selos ─────────────────────────────────

  describe("avaliarElegibilidadeReservaParaSelo", () => {
    const momentoConcluido = new Date("2026-05-10T20:00:00.000Z");

    it("permite selo para reserva avulsa concluída", () => {
      const res = avaliarElegibilidadeReservaParaSelo(reservaBase, [], momentoConcluido);
      expect(res.elegivel).toBe(true);
      expect(res.horasContabilizadas).toBe(1);
      expect(res.valorPorHora).toBe(100);
    });

    it("rejeita reserva se já foi carimbada anteriormente", () => {
      const seloExistente: SeloFidelidade = {
        id: "selo_existente",
        usuarioId: "usr_joao",
        reservaId: reservaBase.id,
        horasContabilizadas: 1,
        valorPorHora: 100,
        valorTotalReserva: 100,
        dataJogo: "2026-05-10",
        criadoEm: "2026-05-10T19:00:00.000Z",
        expiraEm: "2026-08-10",
        resgatado: false,
      };

      const res = avaliarElegibilidadeReservaParaSelo(
        reservaBase,
        [seloExistente],
        momentoConcluido
      );
      expect(res.elegivel).toBe(false);
      expect(res.motivo).toContain("já contabilizada anteriormente");
    });

    it("calcula corretamente proporção para reservas de múltiplas horas", () => {
      const reservaDuasHoras: Reserva = {
        ...reservaBase,
        horarios: ["18:00", "19:00"],
        horaFim: "20:00",
        valorTotal: 250,
      };

      const res = avaliarElegibilidadeReservaParaSelo(
        reservaDuasHoras,
        [],
        new Date("2026-05-10T21:00:00.000Z")
      );
      expect(res.elegivel).toBe(true);
      expect(res.horasContabilizadas).toBe(2);
      expect(res.valorPorHora).toBe(125);
    });
  });

  // ── 4. Cálculo do Ticket Médio ────────────────────────────────────────────

  describe("calcularTicketMedio", () => {
    it("retorna 0 para lista vazia", () => {
      expect(calcularTicketMedio([])).toBe(0);
    });

    it("calcula a média ponderada exata para conjunto de selos", () => {
      // 6 horas de R$ 100 + 6 horas de R$ 120 = R$ 600 + R$ 720 = R$ 1320 / 12h = R$ 110/h
      const selos: SeloFidelidade[] = [
        {
          id: "s1",
          usuarioId: "u1",
          reservaId: "r1",
          horasContabilizadas: 6,
          valorPorHora: 100,
          valorTotalReserva: 600,
          dataJogo: "2026-01-01",
          criadoEm: "2026-01-01T00:00:00.000Z",
          expiraEm: "2026-04-01",
          resgatado: false,
        },
        {
          id: "s2",
          usuarioId: "u1",
          reservaId: "r2",
          horasContabilizadas: 6,
          valorPorHora: 120,
          valorTotalReserva: 720,
          dataJogo: "2026-02-01",
          criadoEm: "2026-02-01T00:00:00.000Z",
          expiraEm: "2026-05-01",
          resgatado: false,
        },
      ];

      expect(calcularTicketMedio(selos)).toBe(110);
    });
  });

  // ── 5. Progresso do Usuário e Expiração ────────────────────────────────────

  describe("calcularProgressoUsuario", () => {
    it("separa selos ativos e expirados pela janela de 3 meses", () => {
      const hoje = "2026-06-01";
      const selos: SeloFidelidade[] = [
        // Selo expirado (expira em 2026-05-01)
        {
          id: "s_antigo",
          usuarioId: "u1",
          reservaId: "r0",
          horasContabilizadas: 2,
          valorPorHora: 100,
          valorTotalReserva: 200,
          dataJogo: "2026-02-01",
          criadoEm: "2026-02-01T00:00:00.000Z",
          expiraEm: "2026-05-01",
          resgatado: false,
        },
        // Selo ativo (expira em 2026-08-01)
        {
          id: "s_recente",
          usuarioId: "u1",
          reservaId: "r1",
          horasContabilizadas: 5,
          valorPorHora: 100,
          valorTotalReserva: 500,
          dataJogo: "2026-05-01",
          criadoEm: "2026-05-01T00:00:00.000Z",
          expiraEm: "2026-08-01",
          resgatado: false,
        },
      ];

      const progresso = calcularProgressoUsuario("u1", selos, [], campanhaTeste, hoje);
      expect(progresso.selosAtivos).toHaveLength(1);
      expect(progresso.selosExpirados).toHaveLength(1);
      expect(progresso.totalHorasAtivas).toBe(5);
      expect(progresso.podeResgatar).toBe(false);
      expect(progresso.percentualConcluido).toBe(42); // 5/12 = 41.6% -> 42%
    });

    it("sinaliza podeResgatar = true quando atinge 12 horas ativas", () => {
      const selos: SeloFidelidade[] = [
        {
          id: "s1",
          usuarioId: "u1",
          reservaId: "r1",
          horasContabilizadas: 12,
          valorPorHora: 100,
          valorTotalReserva: 1200,
          dataJogo: "2026-05-01",
          criadoEm: "2026-05-01T00:00:00.000Z",
          expiraEm: "2026-08-01",
          resgatado: false,
        },
      ];

      const progresso = calcularProgressoUsuario("u1", selos, [], campanhaTeste, "2026-05-15");
      expect(progresso.podeResgatar).toBe(true);
      expect(progresso.percentualConcluido).toBe(100);
      expect(progresso.ticketMedioAtual).toBe(100);
    });
  });

  // ── 6. Resgate de Voucher e Atualização de Selos ───────────────────────────

  describe("resgatarVoucherFidelidade", () => {
    it("emite voucher com código e valor teto baseado no ticket médio", () => {
      const selos: SeloFidelidade[] = [
        {
          id: "s1",
          usuarioId: "u1",
          reservaId: "r1",
          horasContabilizadas: 12,
          valorPorHora: 115,
          valorTotalReserva: 1380,
          dataJogo: "2026-05-01",
          criadoEm: "2026-05-01T00:00:00.000Z",
          expiraEm: "2026-08-01",
          resgatado: false,
        },
      ];

      const res = resgatarVoucherFidelidade("u1", selos, campanhaTeste, "2026-05-02");
      expect(res.voucher.valorTeto).toBe(115);
      expect(res.voucher.codigo).toMatch(/^FID-[A-Z0-9]+-2026$/);
      expect(res.voucher.status).toBe("disponivel");
      expect(res.selosUtilizados[0].resgatado).toBe(true);
      expect(res.selosUtilizados[0].voucherId).toBe(res.voucher.id);
    });

    it("lança erro se não atingir as horas necessárias", () => {
      const selos: SeloFidelidade[] = [
        {
          id: "s1",
          usuarioId: "u1",
          reservaId: "r1",
          horasContabilizadas: 10,
          valorPorHora: 100,
          valorTotalReserva: 1000,
          dataJogo: "2026-05-01",
          criadoEm: "2026-05-01T00:00:00.000Z",
          expiraEm: "2026-08-01",
          resgatado: false,
        },
      ];

      expect(() => resgatarVoucherFidelidade("u1", selos, campanhaTeste)).toThrow(
        /Horas insuficientes/
      );
    });
  });

  // ── 7. Aplicação do Voucher no Checkout (Teto vs Horário Nobre) ───────────

  describe("aplicarDescontoVoucher", () => {
    const voucher: VoucherFidelidade = {
      id: "vch_1",
      codigo: "FID-TEST-2026",
      usuarioId: "u1",
      valorTeto: 100,
      status: "disponivel",
      criadoEm: "2026-05-01T00:00:00.000Z",
      expiraEm: "2026-07-01",
    };

    it("concede 100% de desconto (grátis) se a nova quadra for mais barata ou igual ao teto", () => {
      // Quadra de R$ 80 com voucher de teto R$ 100
      const res = aplicarDescontoVoucher(80, voucher);
      expect(res.valorOriginal).toBe(80);
      expect(res.valorDesconto).toBe(80);
      expect(res.valorFinal).toBe(0);
      expect(res.reservaGratuita).toBe(true);
      expect(res.diferencaNaoUtilizada).toBe(20);
    });

    it("abate o teto e cobra a diferença se o jogo for no horário nobre (mais caro)", () => {
      // Quadra nobre de R$ 160 com voucher de teto R$ 100
      const res = aplicarDescontoVoucher(160, voucher);
      expect(res.valorOriginal).toBe(160);
      expect(res.valorDesconto).toBe(100);
      expect(res.valorFinal).toBe(60);
      expect(res.reservaGratuita).toBe(false);
      expect(res.diferencaNaoUtilizada).toBe(0);
    });
  });

  // ── 8. Regra de Múltiplos Vouchers (Uso Conjunto Obrigatório) ───────────────

  describe("aplicarDescontoVouchers - Regra de Múltiplos Vouchers Conjuntos", () => {
    const voucher1: VoucherFidelidade = {
      id: "vch_1",
      codigo: "FID-OURO-2026",
      usuarioId: "u1",
      valorTeto: 115,
      status: "disponivel",
      criadoEm: "2026-05-01T00:00:00.000Z",
      expiraEm: "2026-07-01",
    };

    const voucher2: VoucherFidelidade = {
      id: "vch_2",
      codigo: "FID-PRATA-2026",
      usuarioId: "u1",
      valorTeto: 85,
      status: "disponivel",
      criadoEm: "2026-05-15T00:00:00.000Z",
      expiraEm: "2026-07-15",
    };

    it("soma os tetos de todos os vouchers disponíveis (115 + 85 = 200) e concede gratuidade quando cobre o total", () => {
      // Quadra de R$ 150 com 2 vouchers totalizando teto de R$ 200
      const res = aplicarDescontoVouchers(150, [voucher1, voucher2]);
      expect(res.valorOriginal).toBe(150);
      expect(res.valorDesconto).toBe(150);
      expect(res.valorFinal).toBe(0);
      expect(res.reservaGratuita).toBe(true);
      expect(res.diferencaNaoUtilizada).toBe(50);
    });

    it("soma os tetos e abate até o limite quando a reserva for superior ao teto conjunto", () => {
      // Quadra nobre de R$ 250 com 2 vouchers totalizando teto de R$ 200
      const res = aplicarDescontoVouchers(250, [voucher1, voucher2]);
      expect(res.valorOriginal).toBe(250);
      expect(res.valorDesconto).toBe(200);
      expect(res.valorFinal).toBe(50);
      expect(res.reservaGratuita).toBe(false);
      expect(res.diferencaNaoUtilizada).toBe(0);
    });

    it("permite aplicar apenas um único voucher separadamente mesmo quando o usuário possui múltiplos disponíveis", () => {
      // Usuário tem voucher1 (115) e voucher2 (85), mas opta por aplicar apenas voucher2
      const res = aplicarDescontoVouchers(100, [voucher2]);
      expect(res.valorOriginal).toBe(100);
      expect(res.valorDesconto).toBe(85);
      expect(res.valorFinal).toBe(15);
      expect(res.reservaGratuita).toBe(false);
      expect(res.diferencaNaoUtilizada).toBe(0);
    });

    it("permite combinar um subconjunto selecionado de vouchers (ex: 2 de 3 disponíveis)", () => {
      const voucher3: VoucherFidelidade = {
        id: "vch_3",
        codigo: "FID-BRONZE-2026",
        usuarioId: "u1",
        valorTeto: 50,
        status: "disponivel",
        criadoEm: "2026-05-20T00:00:00.000Z",
        expiraEm: "2026-07-20",
      };

      // Usuário seleciona apenas voucher2 (85) e voucher3 (50), teto combinado = 135
      const res = aplicarDescontoVouchers(130, [voucher2, voucher3]);
      expect(res.valorOriginal).toBe(130);
      expect(res.valorDesconto).toBe(130);
      expect(res.valorFinal).toBe(0);
      expect(res.reservaGratuita).toBe(true);
      expect(res.diferencaNaoUtilizada).toBe(5);
    });

    it("retorna valor original inalterado quando a lista de vouchers for vazia", () => {
      const res = aplicarDescontoVouchers(100, []);
      expect(res.valorOriginal).toBe(100);
      expect(res.valorDesconto).toBe(0);
      expect(res.valorFinal).toBe(100);
      expect(res.reservaGratuita).toBe(false);
      expect(res.diferencaNaoUtilizada).toBe(0);
    });
  });
});

