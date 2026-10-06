/**
 * Testes Unitários de Regras de Negócio e Validações do Sistema de Vagas Abertas.
 * Abrange casos de sucesso, erros de validação, restrições e ordenação.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  validarAberturaVagas,
  validarDemonstracaoInteresse,
  construirInteresseVaga,
  montarVagasDisponiveis,
  obterInteressadosDaReserva,
  contarInteressadosPendentes,
} from "@/lib/vagas/vagasService";
import type { Reserva } from "@/store/useReservasStore";
import type { InteresseVaga } from "@/lib/vagas/types";
import { getHoje } from "@/lib/constants";

describe("vagasService - Regras de Negócio de Vagas Abertas", () => {
  const hoje = getHoje();

  const reservaBase: Reserva = {
    id: "rsv_teste_1",
    quadraId: "1",
    userId: "usr_organizador_1",
    nomeCliente: "Carlos Silva",
    whatsappCliente: "11988887777",
    cpfCliente: "12345678900",
    data: hoje,
    horarios: ["19:00", "20:00"],
    horaInicio: "19:00",
    horaFim: "21:00",
    valorTotal: 200,
    valorSinal: 80,
    valorPendente: 120,
    status: "confirmada",
    statusWhatsApp: "enviado",
    criadaEm: new Date().toISOString(),
    esporte: "Futebol",
    permiteVagas: true,
    vagasAbertas: 3,
  };

  describe("validarAberturaVagas", () => {
    it("permite abrir vagas válidas quando dados e reserva estão corretos", () => {
      const res = validarAberturaVagas(
        { reservaId: reservaBase.id, vagasAbertas: 4, aceitouTermos: true },
        reservaBase
      );
      expect(res.valido).toBe(true);
      expect(res.erros).toHaveLength(0);
    });

    it("rejeita quando a reserva não existe", () => {
      const res = validarAberturaVagas(
        { reservaId: "inexistente", vagasAbertas: 2, aceitouTermos: true },
        undefined
      );
      expect(res.valido).toBe(false);
      expect(res.erros).toContain("Reserva não encontrada.");
    });

    it("rejeita abrir vagas para reservas canceladas", () => {
      const cancelada: Reserva = { ...reservaBase, status: "cancelada" };
      const res = validarAberturaVagas(
        { reservaId: cancelada.id, vagasAbertas: 2, aceitouTermos: true },
        cancelada
      );
      expect(res.valido).toBe(false);
      expect(res.erros).toContain("Não é possível abrir vagas para uma reserva cancelada.");
    });

    it("rejeita abrir vagas para reservas com data no passado", () => {
      const passada: Reserva = { ...reservaBase, data: "2020-01-01" };
      const res = validarAberturaVagas(
        { reservaId: passada.id, vagasAbertas: 2, aceitouTermos: true },
        passada
      );
      expect(res.valido).toBe(false);
      expect(res.erros).toContain("Não é possível abrir vagas para reservas em datas passadas.");
    });

    it("rejeita número de vagas zero, negativo ou excessivo (>30)", () => {
      const resZero = validarAberturaVagas(
        { reservaId: reservaBase.id, vagasAbertas: 0, aceitouTermos: true },
        reservaBase
      );
      expect(resZero.valido).toBe(false);

      const resNegativo = validarAberturaVagas(
        { reservaId: reservaBase.id, vagasAbertas: -2, aceitouTermos: true },
        reservaBase
      );
      expect(resNegativo.valido).toBe(false);

      const resExcessivo = validarAberturaVagas(
        { reservaId: reservaBase.id, vagasAbertas: 31, aceitouTermos: true },
        reservaBase
      );
      expect(resExcessivo.valido).toBe(false);
      expect(resZero.erros[0]).toContain("entre 1 e 30");
    });

    it("rejeita se o organizador não aceitou os termos de responsabilidade", () => {
      const res = validarAberturaVagas(
        { reservaId: reservaBase.id, vagasAbertas: 2, aceitouTermos: false },
        reservaBase
      );
      expect(res.valido).toBe(false);
      expect(res.erros).toContain(
        "É obrigatório concordar com os termos de responsabilidade e rateio para abrir vagas."
      );
    });
  });

  describe("validarDemonstracaoInteresse", () => {
    it("permite interesse válido de um jogador autenticado em vaga aberta", () => {
      const res = validarDemonstracaoInteresse(
        {
          reservaId: reservaBase.id,
          usuarioId: "usr_jogador_2",
          nomeUsuario: "Marcos Paulo",
          telefoneUsuario: "11977776666",
          aceitouTermos: true,
        },
        reservaBase,
        []
      );
      expect(res.valido).toBe(true);
      expect(res.erros).toHaveLength(0);
    });

    it("impede que o próprio organizador peça vaga na sua reserva", () => {
      const res = validarDemonstracaoInteresse(
        {
          reservaId: reservaBase.id,
          usuarioId: reservaBase.userId!,
          nomeUsuario: "Carlos Silva",
          telefoneUsuario: "11988887777",
          aceitouTermos: true,
        },
        reservaBase,
        []
      );
      expect(res.valido).toBe(false);
      expect(res.erros).toContain("Você não pode solicitar vaga na sua própria reserva.");
    });

    it("impede solicitação se a reserva não permite vagas ou não tem vagas abertas", () => {
      const semVagas: Reserva = { ...reservaBase, permiteVagas: false, vagasAbertas: 0 };
      const res = validarDemonstracaoInteresse(
        {
          reservaId: semVagas.id,
          usuarioId: "usr_jogador_3",
          nomeUsuario: "Lucas",
          telefoneUsuario: "11966665555",
          aceitouTermos: true,
        },
        semVagas,
        []
      );
      expect(res.valido).toBe(false);
      expect(res.erros).toContain("Esta reserva não possui vagas abertas no momento.");
    });

    it("impede solicitações duplicadas do mesmo jogador", () => {
      const interesses: InteresseVaga[] = [
        {
          id: "int_1",
          reservaId: reservaBase.id,
          usuarioId: "usr_jogador_duplicado",
          nomeUsuario: "Felipe",
          telefoneUsuario: "11955554444",
          status: "pendente",
          criadoEm: new Date().toISOString(),
        },
      ];

      const res = validarDemonstracaoInteresse(
        {
          reservaId: reservaBase.id,
          usuarioId: "usr_jogador_duplicado",
          nomeUsuario: "Felipe",
          telefoneUsuario: "11955554444",
          aceitouTermos: true,
        },
        reservaBase,
        interesses
      );
      expect(res.valido).toBe(false);
      expect(res.erros).toContain("Você já manifestou interesse nesta vaga anteriormente.");
    });

    it("rejeita telefone inválido com menos de 8 dígitos", () => {
      const res = validarDemonstracaoInteresse(
        {
          reservaId: reservaBase.id,
          usuarioId: "usr_jogador_4",
          nomeUsuario: "Pedro",
          telefoneUsuario: "1234",
          aceitouTermos: true,
        },
        reservaBase,
        []
      );
      expect(res.valido).toBe(false);
      expect(res.erros).toContain("Número de WhatsApp/telefone inválido para contato.");
    });

    it("rejeita quando usuário não concorda com o termo de isenção", () => {
      const res = validarDemonstracaoInteresse(
        {
          reservaId: reservaBase.id,
          usuarioId: "usr_jogador_5",
          nomeUsuario: "Rodrigo",
          telefoneUsuario: "11944443333",
          aceitouTermos: false,
        },
        reservaBase,
        []
      );
      expect(res.valido).toBe(false);
      expect(res.erros).toContain(
        "É obrigatório aceitar o termo de responsabilidade para enviar seu contato ao organizador."
      );
    });
  });

  describe("construirInteresseVaga", () => {
    it("cria registro de interesse preenchido com status pendente", () => {
      const item = construirInteresseVaga({
        reservaId: "rsv_123",
        usuarioId: "usr_abc",
        nomeUsuario: "  Bruno Henrique  ",
        telefoneUsuario: " (11) 98765-4321 ",
        aceitouTermos: true,
      });

      expect(item.id).toMatch(/^int_/);
      expect(item.reservaId).toBe("rsv_123");
      expect(item.usuarioId).toBe("usr_abc");
      expect(item.nomeUsuario).toBe("Bruno Henrique");
      expect(item.telefoneUsuario).toBe("(11) 98765-4321");
      expect(item.status).toBe("pendente");
      expect(new Date(item.criadoEm).getTime()).toBeGreaterThan(0);
    });
  });

  describe("montarVagasDisponiveis", () => {
    it("filtra apenas reservas ativas futuras com vagas abertas e ordena cronologicamente", () => {
      const lista: Reserva[] = [
        {
          ...reservaBase,
          id: "r1",
          data: "2026-10-15",
          horaInicio: "18:00",
          permiteVagas: true,
          vagasAbertas: 2,
        },
        {
          ...reservaBase,
          id: "r2",
          data: "2026-10-10",
          horaInicio: "20:00",
          permiteVagas: true,
          vagasAbertas: 1,
        },
        {
          ...reservaBase,
          id: "r3_cancelada",
          data: "2026-10-10",
          horaInicio: "19:00",
          status: "cancelada",
          permiteVagas: true,
          vagasAbertas: 3,
        },
        {
          ...reservaBase,
          id: "r4_sem_vagas",
          data: "2026-10-10",
          horaInicio: "17:00",
          permiteVagas: false,
          vagasAbertas: 0,
        },
      ];

      const disponiveis = montarVagasDisponiveis(lista, [], "2026-10-01");
      expect(disponiveis).toHaveLength(2);
      expect(disponiveis[0].reservaId).toBe("r2"); // 2026-10-10 antes de 2026-10-15
      expect(disponiveis[1].reservaId).toBe("r1");
      expect(disponiveis[0].vagasAbertas).toBe(1);
      expect(disponiveis[1].vagasAbertas).toBe(2);
    });

    it("calcula corretamente total de interessados para cada vaga", () => {
      const r = { ...reservaBase, id: "r_com_interessados", data: "2026-10-20" };
      const interesses: InteresseVaga[] = [
        {
          id: "i1",
          reservaId: "r_com_interessados",
          usuarioId: "u1",
          nomeUsuario: "Ana",
          telefoneUsuario: "11911112222",
          status: "pendente",
          criadoEm: new Date().toISOString(),
        },
        {
          id: "i2",
          reservaId: "r_com_interessados",
          usuarioId: "u2",
          nomeUsuario: "Bia",
          telefoneUsuario: "11922223333",
          status: "contatado",
          criadoEm: new Date().toISOString(),
        },
        {
          id: "i3_outra_reserva",
          reservaId: "outra",
          usuarioId: "u3",
          nomeUsuario: "Caio",
          telefoneUsuario: "11933334444",
          status: "pendente",
          criadoEm: new Date().toISOString(),
        },
      ];

      const res = montarVagasDisponiveis([r], interesses, "2026-10-01");
      expect(res).toHaveLength(1);
      expect(res[0].totalInteressados).toBe(2);
    });
  });

  describe("obterInteressadosDaReserva & contarInteressadosPendentes", () => {
    const listaInteresses: InteresseVaga[] = [
      {
        id: "i_antigo",
        reservaId: "rsv_alvo",
        usuarioId: "u1",
        nomeUsuario: "Joao",
        telefoneUsuario: "11911111111",
        status: "contatado",
        criadoEm: "2026-10-01T10:00:00.000Z",
      },
      {
        id: "i_novo",
        reservaId: "rsv_alvo",
        usuarioId: "u2",
        nomeUsuario: "Maria",
        telefoneUsuario: "11922222222",
        status: "pendente",
        criadoEm: "2026-10-02T10:00:00.000Z",
      },
      {
        id: "i_outro",
        reservaId: "outra_rsv",
        usuarioId: "u3",
        nomeUsuario: "Lucas",
        telefoneUsuario: "11933333333",
        status: "pendente",
        criadoEm: "2026-10-03T10:00:00.000Z",
      },
    ];

    it("retorna apenas interessados da reserva alvo ordenados pelo mais recente", () => {
      const res = obterInteressadosDaReserva("rsv_alvo", listaInteresses);
      expect(res).toHaveLength(2);
      expect(res[0].id).toBe("i_novo");
      expect(res[1].id).toBe("i_antigo");
    });

    it("conta com precisão apenas interessados com status pendente", () => {
      const qtdPendentes = contarInteressadosPendentes("rsv_alvo", listaInteresses);
      expect(qtdPendentes).toBe(1);
    });
  });
});
