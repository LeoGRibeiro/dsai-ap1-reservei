import { describe, it, expect, beforeEach } from 'vitest';
import { useReservasStore } from '@/store/useReservasStore';
import type { Reserva } from '@/store/useReservasStore';

const mockReserva: Reserva = {
  id: '123',
  quadraId: 'quadra-1',
  nomeCliente: 'Test Client',
  whatsappCliente: '11999999999',
  cpfCliente: '111.111.111-11',
  data: '2023-12-01',
  horarios: ['10:00'],
  horaInicio: '10:00',
  horaFim: '11:00',
  valorTotal: 100,
  valorSinal: 40,
  valorPendente: 60,
  status: 'confirmada',
  statusWhatsApp: 'nao_enviado',
  criadaEm: new Date().toISOString(),
};

describe('useReservasStore', () => {
  beforeEach(() => {
    // Reset state before each test
    useReservasStore.setState({ reservas: [], isLoadedFromDb: false });
  });

  it('should initialize with empty state', () => {
    const state = useReservasStore.getState();
    expect(state.reservas).toEqual([]);
    expect(state.isLoadedFromDb).toBe(false);
  });

  it('should set reservas and mark as loaded from DB', () => {
    useReservasStore.getState().setReservas([mockReserva]);
    const state = useReservasStore.getState();
    expect(state.reservas).toHaveLength(1);
    expect(state.reservas[0]).toEqual(mockReserva);
    expect(state.isLoadedFromDb).toBe(true);
  });

  it('should add a new reserva', () => {
    useReservasStore.getState().adicionarReserva(mockReserva);
    const state = useReservasStore.getState();
    expect(state.reservas).toHaveLength(1);
    expect(state.reservas[0].id).toBe('123');
  });

  it('should update an existing reserva', () => {
    useReservasStore.getState().adicionarReserva(mockReserva);
    useReservasStore.getState().atualizarReserva('123', { status: 'cancelada' });
    const state = useReservasStore.getState();
    expect(state.reservas[0].status).toBe('cancelada');
  });

  it('should remove a reserva', () => {
    useReservasStore.getState().adicionarReserva(mockReserva);
    useReservasStore.getState().removerReserva('123');
    const state = useReservasStore.getState();
    expect(state.reservas).toHaveLength(0);
  });

  it('should get a reserva by id', () => {
    useReservasStore.getState().adicionarReserva(mockReserva);
    const result = useReservasStore.getState().getReservaById('123');
    expect(result).toEqual(mockReserva);
  });

  it('should return undefined for non-existent id', () => {
    const result = useReservasStore.getState().getReservaById('999');
    expect(result).toBeUndefined();
  });

  it('should get reservas by date', () => {
    useReservasStore.getState().adicionarReserva(mockReserva);
    const result = useReservasStore.getState().getReservasPorData('2023-12-01');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockReserva);
  });
});
