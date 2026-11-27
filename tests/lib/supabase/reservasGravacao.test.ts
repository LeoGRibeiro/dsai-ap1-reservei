import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Reserva } from "@/store/useReservasStore";

// Spec: SPEC/2026-11-24-reserva-atomica.md

const { insert, update, eq, estado } = vi.hoisted(() => {
  const eq = vi.fn();
  return {
    insert: vi.fn(),
    update: vi.fn(() => ({ eq })),
    eq,
    estado: { configurado: true },
  };
});

vi.mock("@/lib/supabase/client", () => ({
  supabase: { from: () => ({ insert, update }) },
  isSupabaseConfigured: () => estado.configurado,
}));

import {
  atualizarReservaComResultado,
  atualizarReservaSupabase,
  inserirReservaComResultado,
  inserirReservaSupabase,
} from "@/lib/supabase/reservasService";

const reserva: Reserva = {
  id: "rsv_1",
  quadraId: "q1",
  data: "2026-12-01",
  horarios: ["18:00"],
  horaInicio: "18:00",
  horaFim: "19:00",
  nomeCliente: "",
  whatsappCliente: "",
  cpfCliente: "",
  valorTotal: 110,
  valorSinal: 44,
  valorPendente: 66,
  status: "em_processamento",
  statusWhatsApp: "nao_enviado",
  criadaEm: "2026-11-24T15:00:00.000Z",
};

describe("gravação de reservas com motivo da recusa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estado.configurado = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("inserção aceita devolve ok", async () => {
    insert.mockResolvedValue({ error: null });
    await expect(inserirReservaComResultado(reserva)).resolves.toEqual({ ok: true });
  });

  it("inserção recusada pelo trigger devolve horario_ocupado", async () => {
    insert.mockResolvedValue({ error: { code: "P0001", message: "horario_ocupado" } });
    await expect(inserirReservaComResultado(reserva)).resolves.toEqual({ ok: false, motivo: "horario_ocupado" });
    await expect(inserirReservaSupabase(reserva)).resolves.toBe(false);
  });

  it("não reenvia a inserção quando o horário está ocupado", async () => {
    insert.mockResolvedValue({ error: { code: "P0001", message: "horario_ocupado" } });
    await inserirReservaComResultado(reserva);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("coluna ausente no schema é removida e a inserção é repetida", async () => {
    insert
      .mockResolvedValueOnce({ error: { message: "Could not find the 'esporte' column of 'reservas'" } })
      .mockResolvedValueOnce({ error: null });
    await expect(inserirReservaComResultado({ ...reserva, esporte: "futsal" as Reserva["esporte"] })).resolves.toEqual({ ok: true });
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it("exceção de rede vira falha", async () => {
    insert.mockRejectedValue(new Error("Failed to fetch"));
    await expect(inserirReservaComResultado(reserva)).resolves.toEqual({ ok: false, motivo: "falha" });
  });

  it("sem Supabase configurado devolve falha sem chamar o banco", async () => {
    estado.configurado = false;
    await expect(inserirReservaComResultado(reserva)).resolves.toEqual({ ok: false, motivo: "falha" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("pagamento depois do prazo devolve reserva_expirada", async () => {
    eq.mockResolvedValue({ error: { code: "P0001", message: "reserva_expirada" } });
    await expect(atualizarReservaComResultado("rsv_1", { status: "pendente" })).resolves.toEqual({
      ok: false,
      motivo: "reserva_expirada",
    });
    await expect(atualizarReservaSupabase("rsv_1", { status: "pendente" })).resolves.toBe(false);
  });

  it("atualização aceita devolve ok", async () => {
    eq.mockResolvedValue({ error: null });
    await expect(atualizarReservaComResultado("rsv_1", { status: "pendente" })).resolves.toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({ status: "pendente" });
  });
});
