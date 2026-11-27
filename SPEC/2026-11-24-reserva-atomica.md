# Especificação: Reserva atômica e expiração da reserva provisória

## Objetivo
Garantir no banco que um horário de uma quadra nunca seja reservado duas vezes, liberar automaticamente os horários de checkouts abandonados e informar o cliente quando a reserva não pôde ser gravada, em vez de mostrar sucesso falso.

## Problemas comprovados
1. **Conflito checado só no navegador**: `getHorariosOcupados` (`src/hooks/useReservasService.ts`) filtra as reservas que o navegador tem em memória. Duas pessoas com a mesma grade aberta conseguem escolher o mesmo horário; o banco aceita as duas gravações porque não há nenhuma restrição em `reservas` (`supabase/migrations/20261117000000_schema_base.sql`).
2. **Gravação sem esperar resposta**: `criarReservaEmProcessamento`, `confirmarPagamento`, `criarReservaManual` e `criarBloqueio` chamam o Supabase com `void` e seguem como se tivesse dado certo. Se a gravação falhar, a tela mostra a reserva e o banco não tem nada.
3. **Reserva provisória eterna**: a reserva `em_processamento` criada ao abrir o checkout só é removida se o cliente clicar em cancelar (`liberarLock`). Fechar a aba deixa o horário ocupado para sempre.
4. **WhatsApp falso**: `confirmarPagamento` grava `statusWhatsApp: "enviado"`, mas nenhuma mensagem é enviada.

## Decisões
1. **Tabela `reservas_horarios`**: uma linha por horário ocupado (`quadra_id`, `data`, `horario`, `reserva_id`), com chave primária em `(quadra_id, data, horario)`. A chave primária é a garantia: a segunda reserva no mesmo horário falha no Postgres, qualquer que seja o caminho de gravação. `reserva_id` referencia `reservas(id)` com `ON DELETE CASCADE`. RLS habilitado **sem policies**: o navegador não lê nem escreve nesta tabela; só os triggers.
2. **Trigger `AFTER INSERT OR UPDATE` em `reservas`** (`SECURITY DEFINER`) mantém a tabela sincronizada. Cobre portal, reserva manual do admin, bloqueio, ocorrências de contrato e MCP sem alterar cada um.
   - Reserva com status diferente de `cancelada` ocupa os seus horários.
   - Reserva cancelada libera os horários; reserva excluída libera pelo `CASCADE`.
   - Mudança de quadra, data ou horários realoca os horários.
   - Horário já ocupado: erro `horario_ocupado` (`ERRCODE P0001`), e a gravação inteira é desfeita.
3. **Prazo da reserva provisória: 10 minutos**, na coluna nova `reservas.expira_em`.
   - Trigger `BEFORE INSERT OR UPDATE`: no insert com status `em_processamento`, `expira_em = now() + 10 min` (o valor enviado pelo navegador é ignorado). Enquanto continua `em_processamento`, o prazo não pode ser estendido.
   - Ao ocupar horários, o trigger cancela antes as reservas `em_processamento` **vencidas** que estão naqueles horários. Não há tarefa agendada: o horário é liberado quando alguém precisa dele.
   - Confirmar o pagamento (`em_processamento` para `pendente` ou `confirmada`) depois do prazo, ou reativar uma provisória que já foi cancelada por expiração, falha com `reserva_expirada`.
4. **Regras puras** em `src/lib/reservas/garantiaHorario.ts`: prazo, cálculo de expiração, `reservaProvisoriaExpirada`, `reservaOcupaHorario` (a grade do portal mostra como livre o horário de uma provisória vencida) e a tradução dos erros do banco para mensagens.
5. **Repositório** (`src/lib/supabase/reservasService.ts`): inserção e atualização passam a devolver o motivo da falha (`horario_ocupado`, `reserva_expirada` ou `falha`). As funções que devolvem `boolean` continuam existindo, apoiadas nas novas, para não alterar quem já as usa.
6. **Hook** (`useReservasService.ts`):
   - `criarReservaEmProcessamento` e `confirmarPagamento` passam a ser assíncronas e devolvem `{ ok: true } | { ok: false; erro }`. Com Supabase configurado, o estado local só muda depois que o banco aceita.
   - `confirmarPagamento` recusa localmente uma provisória vencida antes de chamar o banco e deixa de marcar `statusWhatsApp` como `"enviado"`.
   - `criarReservaManual` e `criarBloqueio` esperam o banco e só entram na tela depois que ele aceita; se o banco recusar, a tela recebe o motivo.
   - Sem Supabase configurado (modo local), o comportamento atual é mantido, com a expiração aplicada pela regra pura.
7. **Portal** (`PortalCliente.tsx`): mostra a mensagem do erro e volta para a grade quando o horário foi ocupado ou o prazo venceu. O texto do toast de sucesso não muda nesta spec (é tratado na tarefa de confirmação pelo WhatsApp do Jonathan).
8. **Dados existentes**: a migração preenche `reservas_horarios` com as reservas ativas. Havendo duplicata, a reserva mais antiga fica com o horário e a outra continua existindo, sem ocupar o horário (nada é apagado). Provisórias antigas recebem `expira_em = criada_em + 10 min`.

## Casos de borda
- Duas inserções no mesmo horário: a primeira grava, a segunda recebe `horario_ocupado`.
- Reservas encostadas (18h e 19h): as duas gravam.
- Mesmo horário em quadras diferentes ou em datas diferentes: as duas gravam.
- Horário repetido dentro da mesma reserva não gera conflito com ela mesma.
- Provisória vencida no horário pedido: é cancelada e a nova reserva grava.
- Provisória ainda no prazo no horário pedido: `horario_ocupado`.
- Pagamento confirmado dentro do prazo: grava e limpa `expira_em`. Depois do prazo: `reserva_expirada`.
- Reserva cancelada libera o horário; reativar uma reserva cancelada só funciona se o horário estiver livre.
- Excluir a reserva (cancelar o checkout) libera o horário.
- Contrato recorrente com uma data em conflito: o lote inteiro falha no banco. O app já bloqueia esse caso antes (`encontrarConflitosDoContrato`); tratar a falha do lote na tela fica fora desta spec.

## Testes
- SQL (`supabase/tests/reserva_atomica.sql`, executado no workflow de migrações dentro de uma transação desfeita no final): cada caso de borda acima que envolve o banco.
- Vitest: regras puras de `garantiaHorario.ts`; classificação de erro no repositório com Supabase simulado; hook recusando pagamento vencido, sem marcar WhatsApp como enviado e sem adicionar a reserva quando o banco recusa; portal mostrando o erro.

## Critérios de aceitação
- Workflow "Migrações do Supabase" verde, incluindo o teste SQL e a reexecução da migração.
- `npm run lint`, `npm run typecheck` e `npm test` sem erros; cobertura das linhas novas acima de 70%.
- No app, abrir o checkout em duas abas no mesmo horário: a segunda recebe a mensagem de horário ocupado.

## Fora do escopo
- Endurecer as policies de `reservas` (bloco A1 + RLS).
- Tarefa agendada (`pg_cron`) para cancelar provisórias vencidas sem novo pedido no mesmo horário.
- Tratar na tela a falha do lote de contrato recorrente.
