/**
 * Regras de eventos: validação do cadastro, situação da inscrição, eventos da
 * landing e mensagens de erro. O banco aplica as mesmas regras de inscrição;
 * aqui elas servem para a tela explicar antes de o usuário tentar.
 *
 * Spec: SPEC/2026-11-27-eventos-e-torneios.md
 */

import type { Evento } from "./types";

export const MENSAGENS_EVENTOS = {
  nomeInvalido: "Informe um nome com 3 a 80 caracteres.",
  dataPassada: "A data do evento não pode estar no passado.",
  horarioInvalido: "Use horas cheias entre 08:00 e 22:00, com o início antes do fim.",
  maxTimesInvalido: "Escolha o número máximo de times: 4, 8 ou 16.",
  prazoDepoisDoEvento: "O prazo de inscrição deve terminar até a data do evento.",
  valorInvalido: "O valor da inscrição não pode ser negativo.",
  nomeTimeInvalido: "O nome do time deve ter de 3 a 40 caracteres.",
  semInscricao: "Este evento não tem inscrição de times.",
  eventoCancelado: "Este evento foi cancelado.",
  inscricoes_encerradas: "As inscrições deste evento estão encerradas.",
  vagas_esgotadas: "As vagas deste torneio já foram preenchidas.",
  conta_necessaria: "Entre na sua conta para inscrever um time.",
  usuario_bloqueado: "Sua conta está bloqueada. Fale com o complexo pelo WhatsApp.",
  time_ja_inscrito: "Você já inscreveu um time neste evento.",
  nome_time_em_uso: "Já existe um time com esse nome neste evento.",
  horario_ocupado: "Já existe reserva na quadra nesse horário. Libere o horário ou escolha outro antes de publicar.",
  minimo_2_times: "É preciso ter pelo menos 2 times confirmados para sortear a chave.",
  maximo_16_times: "A chave aceita no máximo 16 times.",
  empate_exige_penaltis: "Placar empatado: indique o vencedor nos pênaltis.",
  penaltis_so_com_empate: "Pênaltis só valem com placar empatado.",
  placar_invalido: "Informe placares inteiros, a partir de zero.",
  partida_incompleta: "Esta partida ainda não tem os dois times definidos.",
  proxima_partida_ja_jogada: "A partida seguinte já tem resultado. Desfaça-a antes de alterar esta.",
  bye_nao_desfaz: "Um time que avançou sem jogar (bye) não pode ter o resultado desfeito.",
  erroGenerico: "Não foi possível concluir agora. Tente novamente em instantes.",
} as const;

const HORA_CHEIA = /^\d{2}:00$/;
const hora = (h: string) => Number(h.slice(0, 2));

export function validarEvento(evento: Omit<Evento, "id" | "status" | "reservasBloqueio">, hoje: string): string[] {
  const erros: string[] = [];
  const nome = evento.nome.trim();
  if (nome.length < 3 || nome.length > 80) erros.push(MENSAGENS_EVENTOS.nomeInvalido);
  if (!evento.data || evento.data < hoje) erros.push(MENSAGENS_EVENTOS.dataPassada);

  const horariosOk =
    HORA_CHEIA.test(evento.horaInicio) &&
    HORA_CHEIA.test(evento.horaFim) &&
    hora(evento.horaInicio) >= 8 &&
    hora(evento.horaFim) <= 22 &&
    hora(evento.horaInicio) < hora(evento.horaFim);
  if (!horariosOk) erros.push(MENSAGENS_EVENTOS.horarioInvalido);

  if (!(evento.valorInscricao >= 0)) erros.push(MENSAGENS_EVENTOS.valorInvalido);

  if (evento.tipo === "torneio") {
    if (![4, 8, 16].includes(evento.maxTimes ?? 0)) erros.push(MENSAGENS_EVENTOS.maxTimesInvalido);
    if (evento.inscricoesAte && evento.inscricoesAte > evento.data) {
      erros.push(MENSAGENS_EVENTOS.prazoDepoisDoEvento);
    }
  }
  return erros;
}

export function validarNomeTime(nome: string): string | null {
  const limpo = nome.trim();
  return limpo.length >= 3 && limpo.length <= 40 ? null : MENSAGENS_EVENTOS.nomeTimeInvalido;
}

export type SituacaoInscricao = { aberta: true; vagasRestantes: number } | { aberta: false; motivo: string };

/** Espelha a regra do banco (`eventos_validar_inscricao`) para a tela. */
export function situacaoInscricao(evento: Evento, totalInscritos: number, hoje: string): SituacaoInscricao {
  if (evento.tipo !== "torneio") return { aberta: false, motivo: MENSAGENS_EVENTOS.semInscricao };
  if (evento.status === "cancelado") return { aberta: false, motivo: MENSAGENS_EVENTOS.eventoCancelado };
  if (
    evento.status !== "publicado" ||
    evento.data < hoje ||
    (evento.inscricoesAte !== undefined && evento.inscricoesAte < hoje)
  ) {
    return { aberta: false, motivo: MENSAGENS_EVENTOS.inscricoes_encerradas };
  }
  const vagasRestantes = (evento.maxTimes ?? 0) - totalInscritos;
  if (vagasRestantes <= 0) return { aberta: false, motivo: MENSAGENS_EVENTOS.vagas_esgotadas };
  return { aberta: true, vagasRestantes };
}

/** Horas cheias ocupadas pelo evento (do início até antes do fim). */
export function horariosDoEvento(evento: Pick<Evento, "horaInicio" | "horaFim">): string[] {
  const horarios: string[] = [];
  for (let h = hora(evento.horaInicio); h < hora(evento.horaFim); h++) {
    horarios.push(`${String(h).padStart(2, "0")}:00`);
  }
  return horarios;
}

/** Próximos eventos divulgados e o último torneio encerrado, para a landing. */
export function eventosParaLanding(
  eventos: readonly Evento[],
  hoje: string
): { proximos: Evento[]; ultimoEncerrado: Evento | null } {
  const proximos = eventos
    .filter((e) => (e.status === "publicado" || e.status === "chave_sorteada") && e.data >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data));
  const encerrados = eventos
    .filter((e) => e.status === "encerrado")
    .sort((a, b) => b.data.localeCompare(a.data));
  return { proximos, ultimoEncerrado: encerrados[0] ?? null };
}

const CODIGOS: Array<[string, keyof typeof MENSAGENS_EVENTOS]> = [
  ["uq_eventos_inscricoes_usuario", "time_ja_inscrito"],
  ["uq_eventos_inscricoes_nome_time", "nome_time_em_uso"],
  ["inscricoes_encerradas", "inscricoes_encerradas"],
  ["vagas_esgotadas", "vagas_esgotadas"],
  ["conta_necessaria", "conta_necessaria"],
  ["usuario_bloqueado", "usuario_bloqueado"],
  ["horario_ocupado", "horario_ocupado"],
  ["minimo_2_times", "minimo_2_times"],
  ["maximo_16_times", "maximo_16_times"],
  ["empate_exige_penaltis", "empate_exige_penaltis"],
  ["penaltis_so_com_empate", "penaltis_so_com_empate"],
  ["placar_invalido", "placar_invalido"],
  ["partida_incompleta", "partida_incompleta"],
  ["proxima_partida_ja_jogada", "proxima_partida_ja_jogada"],
  ["bye_nao_desfaz", "bye_nao_desfaz"],
];

/** Converte erro do banco ou das regras da chave em mensagem para a tela. */
export function traduzirErroEvento(erro: unknown): string {
  const texto = erro && typeof erro === "object" && "message" in erro ? String((erro as { message: unknown }).message) : "";
  const achado = CODIGOS.find(([codigo]) => texto.includes(codigo));
  return achado ? MENSAGENS_EVENTOS[achado[1]] : MENSAGENS_EVENTOS.erroGenerico;
}
