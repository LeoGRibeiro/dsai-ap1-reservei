import { describe, it, expect } from "vitest";
import {
  classificarTipoSlot,
  montarSlotsQuadraDia,
  validarConflitoBloqueio,
  validarReservaManual,
  construirReservaManual,
  construirBloqueio,
  gerarDiasCalendarioMensal,
  calcularResumoMes,
  isNavegacaoMesPermitida,
  getNomeMesExtenso,
  LIMITE_MESES_FUTURO,
} from "@/lib/adminAgenda/adminAgendaService";
import type { Reserva } from "@/store/useReservasStore";

// ─── Helpers de Criação de Reservas para Teste ─────────────────────────────────

function criarReservaMock(parcial: Partial<Reserva>): Reserva {
  return {
    id: parcial.id ?? "rsv_mock_1",
    quadraId: parcial.quadraId ?? "q1",
    nomeCliente: parcial.nomeCliente ?? "Carlos Silva",
    whatsappCliente: parcial.whatsappCliente ?? "11999998888",
    cpfCliente: parcial.cpfCliente ?? "12345678900",
    data: parcial.data ?? "2026-10-15",
    horarios: parcial.horarios ?? ["18:00", "19:00"],
    horaInicio: parcial.horaInicio ?? "18:00",
    horaFim: parcial.horaFim ?? "20:00",
    valorTotal: parcial.valorTotal ?? 180,
    valorSinal: parcial.valorSinal ?? 72,
    valorPendente: parcial.valorPendente ?? 108,
    status: parcial.status ?? "confirmada",
    statusWhatsApp: parcial.statusWhatsApp ?? "nao_enviado",
    criadaEm: parcial.criadaEm ?? "2026-10-01T10:00:00Z",
    tipoReserva: parcial.tipoReserva,
    observacoes: parcial.observacoes,
  };
}

describe("adminAgendaService - Testes de Unidade e Regras de Negócio", () => {
  // ─── 1. Classificação do Slot ───────────────────────────────────────────────
  describe("classificarTipoSlot", () => {
    it("deve classificar como 'disponivel' quando reserva for undefined", () => {
      expect(classificarTipoSlot(undefined)).toBe("disponivel");
    });

    it("deve classificar como 'disponivel' quando reserva estiver cancelada", () => {
      const cancelada = criarReservaMock({ status: "cancelada" });
      expect(classificarTipoSlot(cancelada)).toBe("disponivel");
    });

    it("deve classificar como 'manutencao_bloqueio' quando for bloqueio administrativo", () => {
      const bloqueio = criarReservaMock({ tipoReserva: "manutencao_bloqueio" });
      expect(classificarTipoSlot(bloqueio)).toBe("manutencao_bloqueio");
    });

    it("deve classificar como 'admin_manual' quando for reserva criada pelo admin", () => {
      const manual = criarReservaMock({ tipoReserva: "admin_manual" });
      expect(classificarTipoSlot(manual)).toBe("admin_manual");
    });

    it("deve classificar como 'escolinha' e 'grupo' conforme o tipo", () => {
      expect(classificarTipoSlot(criarReservaMock({ tipoReserva: "escolinha" }))).toBe("escolinha");
      expect(classificarTipoSlot(criarReservaMock({ tipoReserva: "grupo" }))).toBe("grupo");
    });

    it("deve classificar como 'cliente_online' para reserva avulsa comum", () => {
      expect(classificarTipoSlot(criarReservaMock({ tipoReserva: "avulsa" }))).toBe("cliente_online");
      expect(classificarTipoSlot(criarReservaMock({ tipoReserva: undefined }))).toBe("cliente_online");
    });
  });

  // ─── 2. Montagem dos Slots da Quadra ─────────────────────────────────────────
  describe("montarSlotsQuadraDia", () => {
    it("deve retornar todos os 14 horários operacionais do complexo", () => {
      const slots = montarSlotsQuadraDia("q1", "2026-10-15", []);
      expect(slots).toHaveLength(14);
      expect(slots[0].horario).toBe("08:00");
      expect(slots[0].horaFim).toBe("09:00");
      expect(slots[13].horario).toBe("21:00");
      expect(slots[13].horaFim).toBe("22:00");
      expect(slots.every((s) => s.tipo === "disponivel")).toBe(true);
    });

    it("deve identificar corretamente os horários ocupados por reservas", () => {
      const reserva = criarReservaMock({
        quadraId: "q1",
        data: "2026-10-15",
        horarios: ["14:00", "15:00"],
        tipoReserva: "admin_manual",
        nomeCliente: "Pelada dos Amigos",
      });

      const slots = montarSlotsQuadraDia("q1", "2026-10-15", [reserva]);
      const slot14 = slots.find((s) => s.horario === "14:00");
      const slot15 = slots.find((s) => s.horario === "15:00");
      const slot16 = slots.find((s) => s.horario === "16:00");

      expect(slot14?.tipo).toBe("admin_manual");
      expect(slot14?.nomeExibicao).toBe("Pelada dos Amigos");
      expect(slot15?.tipo).toBe("admin_manual");
      expect(slot16?.tipo).toBe("disponivel");
    });

    it("não deve considerar reservas de outras quadras ou de outros dias", () => {
      const reservaOutraQuadra = criarReservaMock({
        quadraId: "q2",
        data: "2026-10-15",
        horarios: ["14:00"],
      });
      const reservaOutroDia = criarReservaMock({
        quadraId: "q1",
        data: "2026-10-16",
        horarios: ["14:00"],
      });

      const slots = montarSlotsQuadraDia("q1", "2026-10-15", [
        reservaOutraQuadra,
        reservaOutroDia,
      ]);
      const slot14 = slots.find((s) => s.horario === "14:00");
      expect(slot14?.tipo).toBe("disponivel");
    });
  });

  // ─── 3. Validação de Conflito para Bloqueio (Regra de Ouro) ─────────────────
  describe("validarConflitoBloqueio", () => {
    it("deve permitir o bloqueio quando o horário estiver totalmente livre", () => {
      const resultado = validarConflitoBloqueio("q1", "2026-10-15", ["10:00", "11:00"], []);
      expect(resultado.valido).toBe(true);
      expect(resultado.motivo).toBeUndefined();
    });

    it("deve IMPEDIR o bloqueio quando houver reserva ativa de cliente no horário", () => {
      const reserva = criarReservaMock({
        quadraId: "q1",
        data: "2026-10-15",
        horarios: ["10:00", "11:00"],
        nomeCliente: "Fernando Souza",
        horaInicio: "10:00",
        horaFim: "12:00",
        status: "confirmada",
      });

      const resultado = validarConflitoBloqueio(
        "q1",
        "2026-10-15",
        ["11:00", "12:00"],
        [reserva]
      );

      expect(resultado.valido).toBe(false);
      expect(resultado.motivo).toContain("Não é possível bloquear este horário pois já existe uma reserva");
      expect(resultado.motivo).toContain("Fernando Souza");
      expect(resultado.conflitoCom?.id).toBe(reserva.id);
    });

    it("deve permitir o bloqueio se a reserva existente estiver cancelada", () => {
      const cancelada = criarReservaMock({
        quadraId: "q1",
        data: "2026-10-15",
        horarios: ["10:00"],
        status: "cancelada",
      });

      const resultado = validarConflitoBloqueio("q1", "2026-10-15", ["10:00"], [cancelada]);
      expect(resultado.valido).toBe(true);
    });

    it("deve impedir o bloqueio se já houver outro bloqueio no mesmo horário", () => {
      const bloqueioExistente = criarReservaMock({
        quadraId: "q1",
        data: "2026-10-15",
        horarios: ["14:00"],
        tipoReserva: "manutencao_bloqueio",
        nomeCliente: "Bloqueio: Pintura",
      });

      const resultado = validarConflitoBloqueio("q1", "2026-10-15", ["14:00"], [bloqueioExistente]);
      expect(resultado.valido).toBe(false);
      expect(resultado.motivo).toContain("já está bloqueado");
    });

    it("deve rejeitar quadra ou data inválida", () => {
      expect(validarConflitoBloqueio("quadra_fantasma", "2026-10-15", ["10:00"], []).valido).toBe(false);
      expect(validarConflitoBloqueio("q1", "data-invalida", ["10:00"], []).valido).toBe(false);
      expect(validarConflitoBloqueio("q1", "2026-10-15", [], []).valido).toBe(false);
    });
  });

  // ─── 4. Validação de Reserva Manual ─────────────────────────────────────────
  describe("validarReservaManual", () => {
    it("deve aprovar reserva manual válida", () => {
      const resultado = validarReservaManual(
        {
          quadraId: "q1",
          data: "2026-10-15",
          horarios: ["18:00", "19:00"],
          nomeCliente: "Grupo da Quinta",
          pago: false,
        },
        []
      );

      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it("deve reprovar quando nome do cliente for vazio", () => {
      const resultado = validarReservaManual(
        {
          quadraId: "q1",
          data: "2026-10-15",
          horarios: ["18:00"],
          nomeCliente: "   ",
          pago: false,
        },
        []
      );

      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain("Informe o nome do cliente ou do grupo responsável.");
    });

    it("deve reprovar quando horários não forem consecutivos", () => {
      const resultado = validarReservaManual(
        {
          quadraId: "q1",
          data: "2026-10-15",
          horarios: ["14:00", "16:00"],
          nomeCliente: "Lucas",
          pago: false,
        },
        []
      );

      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain("Os horários selecionados devem ser consecutivos (sem intervalos).");
    });

    it("deve reprovar quando houver choque com reserva ou bloqueio existente", () => {
      const bloqueio = criarReservaMock({
        quadraId: "q1",
        data: "2026-10-15",
        horarios: ["18:00"],
        tipoReserva: "manutencao_bloqueio",
        nomeCliente: "Bloqueio: Manutenção Elétrica",
      });

      const resultado = validarReservaManual(
        {
          quadraId: "q1",
          data: "2026-10-15",
          horarios: ["18:00", "19:00"],
          nomeCliente: "Equipe Alpha",
          pago: true,
        },
        [bloqueio]
      );

      expect(resultado.valido).toBe(false);
      expect(resultado.erros[0]).toContain("O horário está bloqueado para manutenção");
    });
  });

  // ─── 5. Criação das Entidades ───────────────────────────────────────────────
  describe("construirReservaManual e construirBloqueio", () => {
    it("deve construir reserva manual com status pago (confirmada) e valores zerados de pendência", () => {
      const reserva = construirReservaManual({
        quadraId: "q1",
        data: "2026-10-20",
        horarios: ["19:00", "20:00"],
        nomeCliente: "Mariana Costa",
        whatsappCliente: "11988887777",
        pago: true,
        esporte: "Futsal",
        observacoes: "Pagou via Pix no balcão",
      });

      expect(reserva.id).toMatch(/^rsv_adm_/);
      expect(reserva.tipoReserva).toBe("admin_manual");
      expect(reserva.status).toBe("confirmada");
      expect(reserva.valorSinal).toBe(reserva.valorTotal);
      expect(reserva.valorPendente).toBe(0);
      expect(reserva.horaInicio).toBe("19:00");
      expect(reserva.horaFim).toBe("21:00");
      expect(reserva.esporte).toBe("Futsal");
    });

    it("deve construir reserva manual com status pendente quando pago=false", () => {
      const reserva = construirReservaManual({
        quadraId: "q2",
        data: "2026-10-20",
        horarios: ["14:00"],
        nomeCliente: "João Pedro",
        pago: false,
      });

      expect(reserva.status).toBe("pendente");
      expect(reserva.valorSinal).toBe(0);
      expect(reserva.valorPendente).toBe(reserva.valorTotal);
    });

    it("deve construir bloqueio de manutenção com valor total zero e status confirmada", () => {
      const bloqueio = construirBloqueio({
        quadraId: "q3",
        data: "2026-10-25",
        horarios: ["08:00", "09:00"],
        motivo: "Troca dos refletores",
        observacoes: "Equipe técnica autorizada",
      });

      expect(bloqueio.id).toMatch(/^bloq_/);
      expect(bloqueio.tipoReserva).toBe("manutencao_bloqueio");
      expect(bloqueio.valorTotal).toBe(0);
      expect(bloqueio.valorSinal).toBe(0);
      expect(bloqueio.valorPendente).toBe(0);
      expect(bloqueio.nomeCliente).toBe("Bloqueio: Troca dos refletores");
      expect(bloqueio.observacoes).toContain("Equipe técnica autorizada");
      expect(bloqueio.status).toBe("confirmada");
    });
  });

  // ─── 6. Calendário Mensal e Navegação ─────────────────────────────────────────
  describe("gerarDiasCalendarioMensal e calcularResumoMes", () => {
    it("deve gerar o grid de dias com preenchimento correto para Outubro de 2026", () => {
      const reserva1 = criarReservaMock({ data: "2026-10-10", horarios: ["10:00", "11:00"] });
      const bloqueio1 = criarReservaMock({
        data: "2026-10-15",
        horarios: ["14:00"],
        tipoReserva: "manutencao_bloqueio",
      });

      const dias = gerarDiasCalendarioMensal(2026, 10, [reserva1, bloqueio1], "2026-10-05");

      // Grid deve ser múltiplo de 7 (semanas completas)
      expect(dias.length % 7).toBe(0);
      expect(dias.length).toBeGreaterThanOrEqual(35);

      // Encontra o dia 10 e o dia 15
      const dia10 = dias.find((d) => d.data === "2026-10-10");
      const dia15 = dias.find((d) => d.data === "2026-10-15");
      const diaHoje = dias.find((d) => d.data === "2026-10-05");

      expect(dia10?.totalReservas).toBe(1);
      expect(dia10?.totalBloqueios).toBe(0);
      expect(dia10?.totalHorariosOcupados).toBe(2);

      expect(dia15?.totalReservas).toBe(0);
      expect(dia15?.totalBloqueios).toBe(1);
      expect(dia15?.totalHorariosOcupados).toBe(1);

      expect(diaHoje?.isHoje).toBe(true);

      const resumo = calcularResumoMes(2026, 10, dias);
      expect(resumo.totalReservas).toBe(1);
      expect(resumo.totalBloqueios).toBe(1);
      expect(resumo.totalHorariosOcupados).toBe(3);
      expect(resumo.diasComReservas).toBe(1);
    });

    it("deve respeitar a regra de limite de navegação temporal futura ampla (120 meses / 10 anos)", () => {
      const hoje = new Date(2026, 9, 5); // 05/10/2026 (mês 9 = Outubro)

      // Outubro 2026 (mês atual)
      const mesAtual = isNavegacaoMesPermitida(2026, 10, hoje);
      expect(mesAtual.podeVoltar).toBe(true);
      expect(mesAtual.podeAvancar).toBe(true);

      // Passado: Outubro 2025 (1 ano atrás) -> permitido
      const anoPassado = isNavegacaoMesPermitida(2025, 10, hoje);
      expect(anoPassado.podeVoltar).toBe(true);
      expect(anoPassado.podeAvancar).toBe(true);

      // Futuro próximo: Julho 2027 (+9 meses) -> permitido
      const julho2027 = isNavegacaoMesPermitida(2027, 7, hoje);
      expect(julho2027.podeVoltar).toBe(true);
      expect(julho2027.podeAvancar).toBe(true);

      // Limite futuro: Outubro 2036 (+120 meses)
      const dezAnosFrente = isNavegacaoMesPermitida(2036, 10, hoje);
      expect(dezAnosFrente.podeAvancar).toBe(false);
    });

    it("deve retornar o nome correto do mês em português", () => {
      expect(getNomeMesExtenso(1)).toBe("Janeiro");
      expect(getNomeMesExtenso(10)).toBe("Outubro");
      expect(getNomeMesExtenso(12)).toBe("Dezembro");
    });
  });
});
