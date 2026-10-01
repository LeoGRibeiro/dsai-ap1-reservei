import type { Reserva, StatusReserva, StatusWhatsApp } from "@/store/useReservasStore";
import type { Esporte } from "@/lib/quadras";

export interface ReservaDbRow {
  id: string;
  quadra_id?: string;
  quadraId?: string;
  nome_cliente?: string;
  nomeCliente?: string;
  whatsapp_cliente?: string;
  whatsappCliente?: string;
  telefone_cliente?: string;
  cpf_cliente?: string;
  cpfCliente?: string;
  data: string;
  horarios: string[] | string;
  hora_inicio?: string;
  horaInicio?: string;
  hora_fim?: string;
  horaFim?: string;
  valor_total?: number | string;
  valorTotal?: number | string;
  valor_sinal?: number | string;
  valorSinal?: number | string;
  valor_pendente?: number | string;
  valorPendente?: number | string;
  status: string;
  status_whatsapp?: string;
  statusWhatsApp?: string;
  criada_em?: string;
  criadaEm?: string;
  esporte?: string | null;
  observacoes?: string | null;
}

/**
 * Converte um registro do banco de dados (snake_case ou camelCase) para a entidade Reserva.
 */
export function rowToReserva(row: ReservaDbRow): Reserva {
  let horariosArray: string[] = [];
  if (Array.isArray(row.horarios)) {
    horariosArray = row.horarios;
  } else if (typeof row.horarios === "string") {
    try {
      const parsed = JSON.parse(row.horarios);
      if (Array.isArray(parsed)) {
        horariosArray = parsed;
      }
    } catch {
      horariosArray = row.horarios.replace(/[{}]/g, "").split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  const horaInicio =
    row.hora_inicio ??
    row.horaInicio ??
    (horariosArray.length > 0 ? horariosArray[0] : "08:00");

  const horaFim =
    row.hora_fim ??
    row.horaFim ??
    (horariosArray.length > 0
      ? `${String(parseInt(horariosArray[horariosArray.length - 1], 10) + 1).padStart(2, "0")}:00`
      : "09:00");

  return {
    id: row.id,
    quadraId: row.quadra_id ?? row.quadraId ?? "",
    nomeCliente: row.nome_cliente ?? row.nomeCliente ?? "",
    whatsappCliente:
      row.whatsapp_cliente ??
      row.whatsappCliente ??
      row.telefone_cliente ??
      "",
    cpfCliente: row.cpf_cliente ?? row.cpfCliente ?? "",
    data: typeof row.data === "string" ? row.data.split("T")[0] : String(row.data),
    horarios: horariosArray,
    horaInicio,
    horaFim,
    valorTotal: Number(row.valor_total ?? row.valorTotal ?? 0),
    valorSinal: Number(row.valor_sinal ?? row.valorSinal ?? 0),
    valorPendente: Number(row.valor_pendente ?? row.valorPendente ?? 0),
    status: (row.status as StatusReserva) || "em_processamento",
    statusWhatsApp: (row.status_whatsapp ?? row.statusWhatsApp ?? "nao_enviado") as StatusWhatsApp,
    criadaEm: row.criada_em ?? row.criadaEm ?? new Date().toISOString(),
    esporte: (row.esporte as Esporte) || undefined,
    observacoes: row.observacoes || undefined,
  };
}

/**
 * Converte um objeto parcial ou completo de Reserva para o payload em snake_case esperado pelo PostgreSQL.
 */
export function reservaToRow(reserva: Partial<Reserva>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (reserva.id !== undefined) row.id = reserva.id;
  if (reserva.quadraId !== undefined) row.quadra_id = reserva.quadraId;
  if (reserva.nomeCliente !== undefined) row.nome_cliente = reserva.nomeCliente;
  if (reserva.whatsappCliente !== undefined) {
    row.whatsapp_cliente = reserva.whatsappCliente;
    row.telefone_cliente = reserva.whatsappCliente;
  }
  if (reserva.cpfCliente !== undefined) row.cpf_cliente = reserva.cpfCliente;
  if (reserva.data !== undefined) row.data = reserva.data;
  if (reserva.horarios !== undefined) row.horarios = reserva.horarios;
  if (reserva.horaInicio !== undefined) row.hora_inicio = reserva.horaInicio;
  if (reserva.horaFim !== undefined) row.hora_fim = reserva.horaFim;
  if (reserva.valorTotal !== undefined) row.valor_total = reserva.valorTotal;
  if (reserva.valorSinal !== undefined) row.valor_sinal = reserva.valorSinal;
  if (reserva.valorPendente !== undefined) row.valor_pendente = reserva.valorPendente;
  if (reserva.status !== undefined) row.status = reserva.status;
  if (reserva.statusWhatsApp !== undefined) row.status_whatsapp = reserva.statusWhatsApp;
  if (reserva.criadaEm !== undefined) row.criada_em = reserva.criadaEm;
  if (reserva.esporte !== undefined) row.esporte = reserva.esporte ?? null;
  if (reserva.observacoes !== undefined) row.observacoes = reserva.observacoes ?? null;

  return row;
}
