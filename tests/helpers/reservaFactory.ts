import type { Reserva } from "@/store/useReservasStore";

/**
 * Monta uma reserva válida (1h às 18:00 na quadra 1, sinal pago) para os testes,
 * sobrescrevendo só os campos que o cenário precisa.
 */
export function criarReservaTeste(overrides: Partial<Reserva> = {}): Reserva {
  return {
    id: "res_teste",
    quadraId: "q1",
    nomeCliente: "Cliente Teste",
    whatsappCliente: "91988887777",
    cpfCliente: "123.456.789-00",
    data: "2026-11-20",
    horarios: ["18:00"],
    horaInicio: "18:00",
    horaFim: "19:00",
    valorTotal: 110,
    valorSinal: 44,
    valorPendente: 66,
    status: "pendente",
    statusWhatsApp: "nao_enviado",
    criadaEm: "2026-11-19T10:00:00Z",
    tipoReserva: "avulsa",
    metodoPagamento: "pix",
    ...overrides,
  };
}
