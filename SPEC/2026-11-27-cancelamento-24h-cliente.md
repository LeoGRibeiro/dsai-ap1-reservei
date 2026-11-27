# Especificação: Política de cancelamento de 24 horas para o cliente (JN-03)

## Objetivo
O cliente só cancela uma reserva pelo site com pelo menos 24 horas de antecedência. Com menos tempo, a tela explica a regra e oferece contato com o complexo pelo WhatsApp. Não há reembolso nem movimentação financeira nesta spec.

## Problemas comprovados
1. `TOLERANCIA_CANCELAMENTO_HORAS = 24` existe em `src/lib/constants.ts`, mas só aparece num texto de `src/components/portal/FormularioIdentificacao.tsx`. Nenhum código aplica a regra.
2. `handleConfirmarCancelamento` em `src/app/minha-conta/page.tsx` cancela qualquer reserva listada em "Próximas", inclusive uma que começa em 10 minutos, uma reserva de contrato recorrente ou uma provisória (`em_processamento`).

## Decisões
1. **Regra pura** em `src/lib/cancelamentoCliente/politicaCancelamento.ts` (não confundir com `src/lib/recorrencia/cancelamento.ts`, que trata contratos):
   - `avaliarCancelamentoOnline(reserva, agora): { permitido: boolean; motivo?: string; horasRestantes: number }`.
   - Início da reserva em horário **local**: `new Date(ano, mes - 1, dia, hora, minuto)` a partir de `reserva.data` + `reserva.horaInicio`, como `isHorarioExpirado` em `constants.ts`. Nunca `toISOString()`.
   - `horasRestantes` = (início − agora) em horas, sem arredondar; negativo quando já começou.
   - Ordem das checagens (o primeiro motivo que se aplica é o devolvido):
     1. `cancelada`: "Esta reserva já foi cancelada."
     2. `em_processamento`: "O pagamento desta reserva ainda não foi concluído."
     3. `contratoId` preenchido: "Reservas de contrato recorrente (escolinhas e grupos) são canceladas pelo complexo."
     4. Já começou ou já passou (`horasRestantes <= 0`): "Esta reserva já começou ou já passou."
     5. Menos de 24h (`horasRestantes < TOLERANCIA_CANCELAMENTO_HORAS`): "Cancelamento pelo site só com pelo menos 24 horas de antecedência. Fale com o complexo pelo WhatsApp."
   - Exatamente 24h antes: permitido.
   - `textoPoliticaCancelamento()`: texto da política exibido no modal, montado a partir da constante.
2. **Tela "Minha Conta"** (`src/app/minha-conta/page.tsx`):
   - Em cada reserva de "Próximas", o botão "Cancelar Reserva" só aparece quando a regra permite.
   - Quando não permite, aparece o motivo e o link "Falar com o complexo" para o WhatsApp, montado com `montarLinkWhatsApp` (`src/lib/landingPage/navegacao.ts`), com uma mensagem citando a data e o horário da reserva. O número continua vindo de `TELEFONE_COMPLEXO` até a JN-04 (configurações do complexo).
   - O modal de cancelamento mostra o texto da política.
   - **Revalidação na confirmação**: ao clicar em "Confirmar Cancelamento", a regra é avaliada de novo com a hora atual. Se não for mais permitido (o modal ficou aberto e passou do limite), a reserva não é cancelada, o modal fecha e um toast de erro mostra o motivo.
3. **Garantia só na tela**: a regra vale na interface. A garantia no banco (a RLS impedir que o cliente cancele com menos de 24h) virá com o endurecimento de RLS do Alexsandro; até lá, uma chamada direta à API ainda conseguiria cancelar.

## Casos de borda
- 25h antes: permitido.
- 23h59 antes: negado com o motivo das 24h.
- Exatamente 24h antes: permitido.
- Virada de dia: reserva amanhã às 09:00, agora hoje às 09:30 (23h30): negado; agora hoje às 08:59: permitido.
- Reserva já cancelada, provisória, de contrato, em andamento ou passada: negado, cada uma com o seu motivo.
- O modal aberto antes do limite e confirmado depois: não cancela.

## Testes
- Vitest `tests/lib/cancelamentoCliente/politicaCancelamento.test.ts`: todos os casos de borda acima e a ordem das checagens.
- Vitest `tests/app/minha-conta/cancelamentoMinhaConta.test.tsx` (hooks simulados, hora fixa com `vi.setSystemTime`): o botão não aparece para reserva dentro de 24h e aparece com o motivo + link de WhatsApp; aparece para reserva com mais de 24h e o modal mostra a política; confirmação depois do limite não chama `cancelarReserva`.

## Critérios de aceitação
- Reserva que começa em menos de 24h não mostra o botão de cancelar.
- `npm run lint`, `npm run typecheck` e `npm test` sem erros.

## Fora do escopo
- Reembolso ou qualquer movimentação financeira.
- Cancelamento pelo admin (continua sem restrição).
- Garantia da regra no banco (RLS do Alexsandro).
