import type { Reserva } from "@/store/useReservasStore";

export const DYNAMIC_PRICING_WEEKS = 4;
export const DYNAMIC_PRICING_DISCOUNT = 0.3;

export interface ResultadoPrecoDinamico {
  precoOriginal: number;
  precoFinal: number;
  desconto: number;
  dinamico: boolean;
}

function arredondarMoeda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function criarDataSegura(data: string): Date {
  const [ano, mes, dia] = data.split("-").map(Number);

  return new Date(Date.UTC(ano, mes - 1, dia));
}

function formatarData(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(data.getUTCDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

/**
 * Retorna as 4 datas anteriores que correspondem
 * ao mesmo dia da semana da data selecionada.
 *
 * Exemplo:
 * quarta-feira 07/10
 *
 * retorna:
 * 30/09
 * 23/09
 * 16/09
 * 09/09
 */
export function obterDatasHistoricas(data: string): string[] {
  const datas: string[] = [];
  const dataBase = criarDataSegura(data);

  for (let semana = 1; semana <= DYNAMIC_PRICING_WEEKS; semana++) {
    const dataHistorica = new Date(dataBase);

    dataHistorica.setUTCDate(
      dataHistorica.getUTCDate() - semana * 7
    );

    datas.push(formatarData(dataHistorica));
  }

  return datas;
}

/**
 * Verifica se uma reserva ocupa determinado horário.
 *
 * Reservas canceladas não são consideradas ocupação.
 */
function reservaOcupaHorario(
  reserva: Reserva,
  data: string,
  quadraId: string,
  horario: string
): boolean {
  if (reserva.data !== data) return false;
  if (reserva.quadraId !== quadraId) return false;

  if (reserva.status === "cancelada") return false;

  return reserva.horarios.includes(horario);
}

/**
 * Verifica se o horário esteve ocupado em alguma
 * das 4 semanas anteriores.
 */
export function horarioTeveOcupacaoHistorica(
  data: string,
  quadraId: string,
  horario: string,
  reservas: Reserva[]
): boolean {
  const datasHistoricas = obterDatasHistoricas(data);

  return datasHistoricas.some((dataHistorica) =>
    reservas.some((reserva) =>
      reservaOcupaHorario(
        reserva,
        dataHistorica,
        quadraId,
        horario
      )
    )
  );
}

/**
 * Calcula o preço dinâmico de um horário.
 *
 * Regra:
 * - Analisa as 4 semanas anteriores.
 * - Mesmo dia da semana.
 * - Mesma quadra.
 * - Mesmo horário.
 * - Se esteve ocupado em qualquer uma das 4 semanas,
 *   mantém o preço normal.
 * - Se ficou vazio nas 4 semanas, aplica 30% de desconto.
 */
export function calcularPrecoDinamico({
  data,
  quadraId,
  horario,
  precoOriginal,
  reservas,
}: {
  data: string;
  quadraId: string;
  horario: string;
  precoOriginal: number;
  reservas: Reserva[];
}): ResultadoPrecoDinamico {
  const teveOcupacao = horarioTeveOcupacaoHistorica(
    data,
    quadraId,
    horario,
    reservas
  );

  if (teveOcupacao) {
    return {
      precoOriginal,
      precoFinal: precoOriginal,
      desconto: 0,
      dinamico: false,
    };
  }

  const precoFinal = arredondarMoeda(
    precoOriginal * (1 - DYNAMIC_PRICING_DISCOUNT)
  );

  return {
    precoOriginal,
    precoFinal,
    desconto: arredondarMoeda(precoOriginal - precoFinal),
    dinamico: true,
  };
}

/**
 * Calcula o valor de vários horários selecionados.
 */
export function calcularValoresDinamicos(
  data: string,
  quadraId: string,
  horarios: string[],
  calcularPrecoHorario: (horario: string) => number,
  reservas: Reserva[]
) {
  let valorOriginal = 0;
  let valorFinal = 0;
  let descontoDinamico = 0;

  const horariosPromocionais: string[] = [];

  for (const horario of horarios) {
    const precoOriginal = calcularPrecoHorario(horario);

    const resultado = calcularPrecoDinamico({
      data,
      quadraId,
      horario,
      precoOriginal,
      reservas,
    });

    valorOriginal += resultado.precoOriginal;
    valorFinal += resultado.precoFinal;
    descontoDinamico += resultado.desconto;

    if (resultado.dinamico) {
      horariosPromocionais.push(horario);
    }
  }

  return {
    valorOriginal: arredondarMoeda(valorOriginal),
    valorFinal: arredondarMoeda(valorFinal),
    descontoDinamico: arredondarMoeda(descontoDinamico),
    horariosPromocionais,
  };
}
