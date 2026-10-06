import { describe, it, expect } from "vitest";
import { rowToReserva, reservaToRow } from "@/lib/supabase/types";
import type { ReservaDbRow } from "@/lib/supabase/types";
import type { Reserva } from "@/store/useReservasStore";
import { formatarMoeda } from "@/lib/constants";

describe("Auditoria Financeira e Modelos de Fidelidade", () => {
  it("deve mapear corretamente os campos de auditoria de voucher do banco (snake_case) para a entidade (camelCase)", () => {
    const dbRow: ReservaDbRow = {
      id: "rsv_fidelidade_test",
      quadra_id: "q1",
      nome_cliente: "Carlos Silva",
      whatsapp_cliente: "11988887777",
      cpf_cliente: "123.456.789-00",
      data: "2026-10-10",
      horarios: ["18:00", "19:00"],
      hora_inicio: "18:00",
      hora_fim: "20:00",
      valor_total: 0,
      valor_sinal: 0,
      valor_pendente: 0,
      valor_original: 180,
      desconto_fidelidade: 180,
      vouchers_utilizados: ["FID-ABC1234", "FID-XYZ9876"],
      reserva_gratuita_fidelidade: true,
      metodo_pagamento: "fidelidade",
      status: "confirmada",
      status_whatsapp: "enviado",
      criada_em: "2026-10-05T12:00:00.000Z",
    };

    const reserva = rowToReserva(dbRow);

    expect(reserva.id).toBe("rsv_fidelidade_test");
    expect(reserva.valorTotal).toBe(0);
    expect(reserva.valorOriginal).toBe(180);
    expect(reserva.descontoFidelidade).toBe(180);
    expect(reserva.vouchersUtilizados).toEqual(["FID-ABC1234", "FID-XYZ9876"]);
    expect(reserva.reservaGratuitaFidelidade).toBe(true);
    expect(reserva.metodoPagamento).toBe("fidelidade");
  });

  it("deve mapear a entidade Reserva de volta para snake_case no salvamento do Supabase", () => {
    const reserva: Reserva = {
      id: "rsv_fidelidade_parcial",
      quadraId: "q2",
      nomeCliente: "Mariana Souza",
      whatsappCliente: "11977776666",
      cpfCliente: "987.654.321-99",
      data: "2026-10-12",
      horarios: ["20:00", "21:00"],
      horaInicio: "20:00",
      horaFim: "22:00",
      valorTotal: 90,
      valorSinal: 36,
      valorPendente: 54,
      valorOriginal: 180,
      descontoFidelidade: 90,
      vouchersUtilizados: ["FID-PARCIAL1"],
      reservaGratuitaFidelidade: false,
      metodoPagamento: "misto",
      status: "pendente",
      statusWhatsApp: "enviado",
      criadaEm: "2026-10-05T14:00:00.000Z",
    };

    const row = reservaToRow(reserva);

    expect(row.valor_original).toBe(180);
    expect(row.desconto_fidelidade).toBe(90);
    expect(row.vouchers_utilizados).toEqual(["FID-PARCIAL1"]);
    expect(row.reserva_gratuita_fidelidade).toBe(false);
    expect(row.metodo_pagamento).toBe("misto");
  });

  it("calcula corretamente os totais financeiros separando bruto de quadras, abatimentos de fidelidade e caixa recebido", () => {
    const reservasMock: Reserva[] = [
      // 1. Reserva Comum (Pix)
      {
        id: "r1",
        quadraId: "q1",
        nomeCliente: "Comum",
        whatsappCliente: "11999990001",
        cpfCliente: "",
        data: "2026-10-10",
        horarios: ["18:00"],
        horaInicio: "18:00",
        horaFim: "19:00",
        valorTotal: 90,
        valorSinal: 90,
        valorPendente: 0,
        status: "confirmada",
        statusWhatsApp: "enviado",
        criadaEm: "2026-10-01",
      },
      // 2. Reserva 100% Gratuita Fidelidade
      {
        id: "r2",
        quadraId: "q2",
        nomeCliente: "Fidelidade Total",
        whatsappCliente: "11999990002",
        cpfCliente: "",
        data: "2026-10-10",
        horarios: ["19:00"],
        horaInicio: "19:00",
        horaFim: "20:00",
        valorTotal: 0,
        valorSinal: 0,
        valorPendente: 0,
        valorOriginal: 90,
        descontoFidelidade: 90,
        vouchersUtilizados: ["FID-001"],
        reservaGratuitaFidelidade: true,
        metodoPagamento: "fidelidade",
        status: "confirmada",
        statusWhatsApp: "enviado",
        criadaEm: "2026-10-01",
      },
      // 3. Reserva Mista (Voucher + Pix) com sinal pago e restante pendente
      {
        id: "r3",
        quadraId: "q3",
        nomeCliente: "Fidelidade Mista",
        whatsappCliente: "11999990003",
        cpfCliente: "",
        data: "2026-10-10",
        horarios: ["20:00", "21:00"],
        horaInicio: "20:00",
        horaFim: "22:00",
        valorTotal: 90,
        valorSinal: 36,
        valorPendente: 54,
        valorOriginal: 180,
        descontoFidelidade: 90,
        vouchersUtilizados: ["FID-002"],
        reservaGratuitaFidelidade: false,
        metodoPagamento: "misto",
        status: "pendente",
        statusWhatsApp: "enviado",
        criadaEm: "2026-10-01",
      },
    ];

    // Cálculos análogos aos executados em useReservasService
    const naoCanceladas = reservasMock.filter((r) => r.status !== "cancelada");

    const totalDescontoFidelidade = naoCanceladas.reduce(
      (acc, r) => acc + (Number(r.descontoFidelidade) || 0),
      0
    );

    const totalBrutoQuadras = naoCanceladas.reduce((acc, r) => {
      const original =
        r.valorOriginal !== undefined
          ? Number(r.valorOriginal)
          : r.valorTotal + (Number(r.descontoFidelidade) || 0);
      return acc + original;
    }, 0);

    const totalConfirmado = naoCanceladas.reduce((acc, r) => acc + r.valorSinal, 0);
    const pendenteBalcao = naoCanceladas.reduce((acc, r) => acc + r.valorPendente, 0);

    // Validações
    expect(totalDescontoFidelidade).toBe(180); // 90 (r2) + 90 (r3)
    expect(totalBrutoQuadras).toBe(360); // 90 (r1) + 90 (r2) + 180 (r3)
    expect(totalConfirmado).toBe(126); // 90 (r1) + 0 (r2) + 36 (r3)
    expect(pendenteBalcao).toBe(54); // 0 (r1) + 0 (r2) + 54 (r3)
  });

  it("deve lidar com linhas antigas do Supabase onde colunas novas de fidelidade são null sem gerar NaN", () => {
    // Linha típica de banco PostgreSQL onde colunas recém-adicionadas vêm como null
    const dbRowComNulos = {
      id: "rsv_legada_campeoes",
      quadra_id: "q2",
      nome_cliente: "Campeões Voleibol",
      whatsapp_cliente: "19990129309",
      cpf_cliente: "",
      data: "2026-09-29",
      horarios: ["19:00", "20:00", "21:00"],
      hora_inicio: "19:00",
      hora_fim: "22:00",
      valor_total: 330,
      valor_sinal: 0,
      valor_pendente: 330,
      valor_original: null,
      desconto_fidelidade: null,
      vouchers_utilizados: null,
      reserva_gratuita_fidelidade: null,
      permite_vagas: null,
      vagas_abertas: null,
      status: "confirmada",
      tipo_reserva: "grupo",
      contrato_id: "ctr_volei",
    };

    const reserva = rowToReserva(dbRowComNulos as unknown as ReservaDbRow);

    expect(reserva.valorTotal).toBe(330);
    expect(reserva.valorOriginal).toBeUndefined();
    expect(Number.isNaN(reserva.valorOriginal)).toBe(false);
    expect(reserva.descontoFidelidade).toBeUndefined();
    expect(Number.isNaN(reserva.descontoFidelidade)).toBe(false);
    expect(reserva.vagasAbertas).toBeUndefined();
    expect(Number.isNaN(reserva.vagasAbertas)).toBe(false);
  });

  it("calcula total bruto de quadras e valor tabela sem NaN para reservas legadas", () => {
    const reservaLegada: Reserva = {
      id: "rsv_legada",
      quadraId: "q2",
      nomeCliente: "Campeões Voleibol",
      whatsappCliente: "19990129309",
      cpfCliente: "",
      data: "2026-09-29",
      horarios: ["19:00", "20:00", "21:00"],
      horaInicio: "19:00",
      horaFim: "22:00",
      valorTotal: 330,
      valorSinal: 0,
      valorPendente: 330,
      valorOriginal: undefined,
      descontoFidelidade: undefined,
      status: "confirmada",
      criadaEm: "2026-09-29T10:00:00.000Z",
    };

    const desc = Number(reservaLegada.descontoFidelidade) || 0;
    const valorBruto =
      reservaLegada.valorOriginal !== undefined &&
      !isNaN(Number(reservaLegada.valorOriginal)) &&
      Number(reservaLegada.valorOriginal) > 0
        ? Number(reservaLegada.valorOriginal)
        : (Number(reservaLegada.valorTotal) || 0) + desc;

    expect(valorBruto).toBe(330);
    expect(Number.isNaN(valorBruto)).toBe(false);
    expect(formatarMoeda(valorBruto)).toBe("R$\u00a0330,00");
  });

  it("formatarMoeda protege contra NaN e valores inválidos retornando R$ 0,00", () => {
    expect(formatarMoeda(NaN)).toBe("R$\u00a00,00");
    expect(formatarMoeda(Infinity)).toBe("R$\u00a00,00");
    expect(formatarMoeda(undefined as unknown as number)).toBe("R$\u00a00,00");
    expect(formatarMoeda(100)).toBe("R$\u00a0100,00");
  });
});

