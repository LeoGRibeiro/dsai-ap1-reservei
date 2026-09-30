/**
 * Dados do complexo esportivo — um único estabelecimento com múltiplas quadras idênticas.
 * Todas as quadras têm o mesmo piso (PU) e as mesmas comodidades.
 */

// ─── Esportes disponíveis ─────────────────────────────────────────────────────

/**
 * Esporte que será praticado na reserva (campo opcional).
 * Quando informado, a administração prepara a quadra adequadamente
 * (ex.: instalar rede de vôlei, posicionar traves de futsal, etc.).
 */
export type Esporte =
  | "Futsal"
  | "Vôlei"
  | "Basquete"
  | "Handebol"
  | "Outro";

export const ESPORTES: Esporte[] = [
  "Futsal",
  "Vôlei",
  "Basquete",
  "Handebol",
  "Outro",
];

/** Equipamentos que a administração monta por esporte */
export const PREPARACAO_POR_ESPORTE: Record<Esporte, string> = {
  Futsal: "Posicionamento e fixação das traves de futsal",
  Vôlei: "Montagem da rede e marcação das linhas de vôlei",
  Basquete: "Posicionamento das tabelas de basquete",
  Handebol: "Posicionamento das traves de handebol",
  Outro: "Preparação padrão (sem equipamento específico)",
};

// ─── Quadras ──────────────────────────────────────────────────────────────────

export interface Quadra {
  id: string;
  numero: number;        // "Quadra 1", "Quadra 2", etc.
  descricao: string;
}

/**
 * Comodidades comuns a todas as quadras do complexo.
 * Piso de pintura PU — todas idênticas.
 */
export const COMODIDADES_COMPLEXO: string[] = [
  "Piso PU (pintura poliuretânica)",
  "Vestiário masculino e feminino",
  "Iluminação LED noturna",
  "Estacionamento gratuito",
  "Bebedouro",
];

/** Quadras do complexo — altere a quantidade conforme o estabelecimento */
export const QUADRAS: Quadra[] = [
  { id: "q1", numero: 1, descricao: "Quadra poliesportiva coberta" },
  { id: "q2", numero: 2, descricao: "Quadra poliesportiva coberta" },
  { id: "q3", numero: 3, descricao: "Quadra poliesportiva coberta" },
];

/** Valor padrão por hora (igual para todas as quadras) */
export const VALOR_HORA = 90; // em reais

// ─── Horários ─────────────────────────────────────────────────────────────────

/** Horários disponíveis para agendamento (blocos de 1 hora) */
export const HORARIOS_DISPONIVEIS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00",
];
