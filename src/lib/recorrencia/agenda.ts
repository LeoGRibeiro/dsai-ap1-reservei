/**
 * Consultas de agenda do portal: quais blocos de escolinha existem
 * para uma quadra/data, para exibir o banner promocional.
 */

import type { Reserva } from "@/store/useReservasStore";
import type { Esporte } from "@/lib/quadras";
import { isReservaAtiva } from "./ocorrencias";
import type { ContratoRecorrente, DiaSemana } from "./types";

export interface AvisoEscolinha {
  contratoId: string;
  nome: string;
  esporte?: Esporte;
  horaInicio: string;
  horaFim: string;
  /** Slots cobertos pelo bloco (ex.: ["14:00", "15:00"]) */
  horarios: string[];
  contatoWhatsapp: string;
  /** Detalhes disponíveis apenas quando o contrato foi carregado */
  descricao?: string;
  responsavelNome?: string;
  diasSemana?: DiaSemana[];
}

/**
 * Lista os blocos de escolinha ativos numa quadra/data, ordenados por horário.
 * Usa os dados da própria reserva e enriquece com o contrato quando disponível,
 * assim o banner funciona mesmo se a tabela de contratos ainda não carregou.
 */
export function obterAvisosEscolinha(
  reservas: Reserva[],
  contratos: ContratoRecorrente[],
  data: string,
  quadraId: string
): AvisoEscolinha[] {
  return reservas
    .filter(
      (r) =>
        r.tipoReserva === "escolinha" &&
        isReservaAtiva(r) &&
        r.data === data &&
        r.quadraId === quadraId
    )
    .map((r) => {
      const contrato = contratos.find((c) => c.id === r.contratoId);
      const fallbackDescricao =
        r.observacoes &&
        !r.observacoes.startsWith("Escolinha:") &&
        !r.observacoes.startsWith("Grupo recorrente:")
          ? r.observacoes
          : undefined;

      return {
        contratoId: r.contratoId ?? r.id,
        nome: contrato?.nome ?? r.nomeCliente,
        esporte: contrato?.esporte ?? r.esporte,
        horaInicio: r.horaInicio,
        horaFim: r.horaFim,
        horarios: r.horarios,
        contatoWhatsapp: contrato?.contatoWhatsapp ?? r.whatsappCliente,
        descricao: contrato?.descricao ?? fallbackDescricao,
        responsavelNome: contrato?.responsavelNome,
        diasSemana: contrato?.diasSemana,
      };
    })
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
}

/** Slots (de qualquer escolinha) numa quadra/data — úteis para estilizar a grade */
export function obterHorariosEscolinha(avisos: AvisoEscolinha[]): string[] {
  return avisos.flatMap((a) => a.horarios);
}

/** Monta o link do WhatsApp (wa.me) com mensagem pré-preenchida */
export function montarLinkWhatsApp(telefone: string, mensagem: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const numero = digitos.startsWith("55") && digitos.length >= 12 ? digitos : `55${digitos}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
