/**
 * Dados fixos das quadras esportivas do complexo.
 * Servem como "tabela de quadras" do banco de dados simulado.
 */

export interface Quadra {
  id: string;
  nome: string;
  tipo: "Society" | "Futsal" | "Beach Tennis" | "Basquete" | "Vôlei";
  descricao: string;
  capacidade: number;       // número de jogadores
  valorHora: number;        // em reais
  imagemUrl: string;
  comodidades: string[];
}

export const QUADRAS: Quadra[] = [
  {
    id: "q1",
    nome: "Quadra Society 1",
    tipo: "Society",
    descricao: "Campo society gramado sintético de última geração, ideal para peladas com amigos.",
    capacidade: 14,
    valorHora: 120,
    imagemUrl: "/images/quadra-society.jpg",
    comodidades: ["Vestiário", "Iluminação noturna", "Estacionamento"],
  },
  {
    id: "q2",
    nome: "Quadra Futsal Arena",
    tipo: "Futsal",
    descricao: "Quadra de futsal com piso emborrachado profissional e arquibancada coberta.",
    capacidade: 10,
    valorHora: 90,
    imagemUrl: "/images/quadra-futsal.jpg",
    comodidades: ["Vestiário", "Iluminação noturna", "Placar eletrônico"],
  },
  {
    id: "q3",
    nome: "Beach Tennis Court",
    tipo: "Beach Tennis",
    descricao: "Arena de areia natural importada para beach tennis e beach vôlei.",
    capacidade: 4,
    valorHora: 70,
    imagemUrl: "/images/quadra-beach.jpg",
    comodidades: ["Ducha externa", "Iluminação noturna", "Aluguel de raquetes"],
  },
  {
    id: "q4",
    nome: "Quadra Basquete",
    tipo: "Basquete",
    descricao: "Quadra de basquete com piso poliesportivo e tabelas regulamentares.",
    capacidade: 10,
    valorHora: 80,
    imagemUrl: "/images/quadra-basquete.jpg",
    comodidades: ["Vestiário", "Estacionamento"],
  },
  {
    id: "q5",
    nome: "Quadra Vôlei Coberta",
    tipo: "Vôlei",
    descricao: "Ginásio poliesportivo coberto para vôlei com piso de madeira tratada.",
    capacidade: 12,
    valorHora: 85,
    imagemUrl: "/images/quadra-volei.jpg",
    comodidades: ["Vestiário", "Ar-condicionado", "Placar eletrônico"],
  },
];

/** Horários disponíveis para agendamento (intervalos de 1h) */
export const HORARIOS_DISPONIVEIS = [
  "07:00", "08:00", "09:00", "10:00", "11:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00",
];
