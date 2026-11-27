# Especificação: Eventos e torneios

## Objetivo
Concluir a seção "Eventos" da landing, que os autores deixaram como "Em construção", e evoluí-la com torneios de mata-mata: o admin cadastra e divulga eventos, clientes inscrevem times e o admin conduz a chave até o campeão.

## Problema comprovado
- `src/lib/landingPage/secoes.ts`: a seção Eventos está em `PLACEHOLDERS_SECOES`, com os itens planejados "Cards de torneios, ligas e eventos sociais", "Data, horário, valor de inscrição e regras" e "Cadastro de eventos e banners pelo Painel Admin". A spec citada (`SPEC/2026-10-06-lp-eventos-fidelidade.md`) nunca foi criada.
- Perguntados sobre a evolução esperada, os autores responderam: "terminar todas as features que estavam lá em progresso".

## Regras de negócio
### Evento
- Tipos: **torneio** (com inscrição de times e chave) e **social** (só divulgação).
- Campos: nome, tipo, esporte, descrição, regras, data, horário de início e fim (horas cheias), quadra, banner, valor da inscrição (**só informativo**, pago no local; sem transação financeira), máximo de times (4, 8 ou 16) e data limite de inscrição (torneio).
- Situação: `rascunho` → `publicado` → `chave_sorteada` → `encerrado`; de `rascunho` ou `publicado` pode ir para `cancelado`.
- Data, horário e quadra só mudam em `rascunho`.
- **Publicar** bloqueia a quadra no horário do evento usando o bloqueio de horário que já existe na agenda. Se houver reserva no horário, a publicação falha com a mensagem de horário ocupado e o evento continua em rascunho. O bloqueio fica fora do financeiro e aparece ocupado na grade.
- **Cancelar** libera os bloqueios de quadra; o card mostra "Cancelado".

### Inscrição (torneio)
- Só cliente logado, com conta (não visitante anônimo), e não bloqueado.
- Um time por cliente por evento; nome do time único no evento, sem diferenciar maiúsculas; nome com 3 a 40 caracteres.
- Aceita só com o evento `publicado`, até a data limite (inclusive) e antes da data do evento, enquanto houver vaga (`max_times`). O banco recusa fora disso, com o motivo.
- O cliente pode desistir (excluir a própria inscrição) enquanto o evento estiver `publicado`.
- O admin confirma a inscrição quando o pagamento é feito no local. Só times confirmados entram na chave.
- Público vê só o nome dos times confirmados; WhatsApp do responsável só para o admin e o próprio dono.

### Chave de mata-mata
- O admin sorteia a chave com pelo menos 2 times confirmados. Depois do sorteio, inscrições fecham e a chave congela.
- Tamanho da chave: próxima potência de 2 (2, 4, 8 ou 16). As vagas que sobram viram **bye**: o time avança sem jogar. Os byes ficam na primeira rodada e nunca há bye contra bye.
- Resultado: placar dos dois times. **Empate não existe no mata-mata**: com placar igual, o admin indica o vencedor nos pênaltis.
- **W.O.**: o admin marca qual time não compareceu; o outro avança.
- O vencedor vai automaticamente para a próxima partida.
- Corrigir ou desfazer um resultado só é permitido se a partida seguinte ainda não tiver resultado.
- Quando a final tem vencedor, o evento passa a `encerrado` e o vencedor é o campeão.

### Landing e página do evento
- Seção Eventos: próximos eventos publicados (data a partir de hoje, ordem de data) e, se houver, o último torneio encerrado com o campeão. Sem nada para mostrar, a seção mostra uma mensagem curta, não o placeholder.
- Página `/eventos/[id]`: detalhes, regras, valor, situação da inscrição, formulário de inscrição (ou convite para entrar), times confirmados e chave.

## Banco (migração `supabase/migrations/20261127120000_eventos_e_torneios.sql`)
- `eventos`, `eventos_inscricoes` (únicos: evento + cliente; evento + nome do time normalizado) e `eventos_partidas` (rodada, posição, times, placar, vencedor, tipo de resultado).
- Visão `eventos_times_publicos`: id, evento e nome dos times confirmados.
- RLS: eventos visíveis ao público fora de rascunho, gestão do admin; inscrição do próprio cliente (sem confirmar a si mesmo), leitura do dono e do admin, confirmação só do admin; partidas com leitura pública e escrita do admin.
- Trigger na inscrição (com trava no evento para evitar duas inscrições na última vaga): `inscricoes_encerradas`, `vagas_esgotadas`, `usuario_bloqueado`; duplicidades viram `time_ja_inscrito` e `nome_time_em_uso`.

## Organização do código
- Regras puras em `src/lib/eventos/` (validação do evento, situação da inscrição, geração da chave com byes, registro e desfazer de resultado, campeão, eventos da landing).
- Acesso ao banco em `src/lib/supabase/eventosRepository.ts`; hook `useEventosService`.
- Admin: tela "Eventos"; público: `SecaoEventos` e a rota `/eventos/[id]`; componente da chave compartilhado.
- A landing passa a aceitar seções implementadas no lugar dos placeholders, mantendo a ordem do menu (`LandingSecoesPlaceholder` recebe as seções reais por id).

## Testes
- SQL (`supabase/tests/eventos.sql`): cada regra de inscrição, RLS por papel e visão pública sem WhatsApp.
- Vitest: chave com 2, 3, 5, 6, 8 e 16 times (byes, sem bye contra bye, avanço automático), empate exige pênaltis, W.O., corrigir só sem próxima jogada, campeão, situação da inscrição, eventos da landing; repositório com erros do banco traduzidos; telas de inscrição e de lançamento de resultado.

## Critérios de aceitação
- Seção Eventos sem o selo "Em construção".
- Torneio completo no Supabase local: publicar (quadra bloqueada), inscrever times, confirmar, sortear, lançar resultados até o campeão.
- CI verde, cobertura das linhas novas acima de 70%.

## Fora do escopo
- Ligas por pontos corridos, várias categorias no mesmo evento, disputa de 3º lugar, dupla eliminação.
- Pagamento online da inscrição.
- Evento em mais de uma quadra ou em mais de um dia.
