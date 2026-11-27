# Especificação: Financeiro correto e exportação em CSV (JN-02)

## Objetivo
O painel financeiro e o dashboard do admin mostram valores que batem com as regras do sistema, sem contar bloqueios e reservas provisórias, e o admin exporta a lista do financeiro em CSV.

## Problemas comprovados
1. **Sinal pago fora do recebido** (`src/hooks/useReservasService.ts`, `financeiro`): `totalConfirmado` só soma o `valorSinal` das reservas `confirmada`. Pelo próprio store (`src/store/useReservasStore.ts`), `pendente` significa "sinal pago, restante a pagar no dia", então esses sinais ficam fora do recebido. O mesmo vale para `pendenteSinalConfirmado`, que ignora o saldo das reservas `pendente`.
2. **Bloqueios e provisórias nas métricas**: bloqueios são gravados como reservas `confirmada` com `tipoReserva: "manutencao_bloqueio"` (`src/lib/adminAgenda/adminAgendaService.ts`). `SPEC/2026-10-05-agenda-completa-admin.md` diz que bloqueios não entram nas métricas financeiras. O financeiro filtra só `status !== "cancelada"`, então conta bloqueios e reservas `em_processamento` no gráfico de 7 dias, nos totais por quadra e na lista.
3. **Ocupação com números fixos** (`src/components/admin/AdminDashboardPage.tsx`): `const totalSlots = 3 * 15`, mas são 14 horários (`HORARIOS_DISPONIVEIS`) e a quantidade de quadras está em `QUADRAS.length`. Bloqueios e provisórias contam como ocupação.
4. **Exportação prometida e inexistente**: o documento dos autores promete "exportação de dados" no financeiro; não há CSV, `Blob` nem download no código.
5. **Cálculo do valor bruto repetido** três vezes (hook e duas vezes em `AdminFinanceiroPage.tsx`).

## Decisões
1. **Regras puras** em `src/lib/financeiro/calculosFinanceiros.ts`:
   - `filtrarReservasFinanceiras(reservas)`: exclui `cancelada`, `em_processamento` e `tipoReserva === "manutencao_bloqueio"`.
   - `valorBrutoReserva(reserva)`: `valorOriginal` quando positivo; senão `valorTotal + descontoFidelidade`. Valores inválidos contam 0.
   - `calcularResumoFinanceiro(reservas)`: aplica o filtro e devolve `recebido` (soma de `valorSinal`), `aReceberNoLocal` (soma de `valorPendente`), `previsto` (soma de `valorTotal`), `brutoTabela` e `descontosFidelidade`. As reservas válidas são `pendente` e `confirmada`. Na quitação no balcão e no pagamento integral o código já grava `valorSinal = valorTotal` e `valorPendente = 0`, então nada é contado em dobro.
   - `calcularTaxaOcupacao(reservasDoDia, totalQuadras, totalHorarios)`: capacidade = quadras × horários − horários bloqueados; ocupados = horários distintos (quadra + horário) das reservas válidas que não estão bloqueados; percentual inteiro, limitado a 100; capacidade zero devolve 0.
   - `gerarCsvReservas(reservas)` e `nomeArquivoCsvFinanceiro(dataISO)`.
2. **`useReservasService.ts` não é alterado** (arquivo do Alexsandro). O `financeiro` do hook continua existindo, mas as telas do admin passam a usar as regras puras.
3. **CSV**:
   - Colunas: Data, Quadra, Início, Fim, Cliente, WhatsApp, Status, Tipo, Método de pagamento, Valor total, Sinal, Pendente, Desconto fidelidade. **Sem CPF.**
   - Separador `;`, quebra de linha `\r\n`, BOM UTF-8 (`﻿`) no início para o Excel abrir acentos.
   - Datas `DD/MM/AAAA`; valores com duas casas e vírgula decimal, sem separador de milhar (`1234,50`).
   - Status e tipo traduzidos ("Sinal pago", "Confirmada", "Avulsa", "Escolinha"...). Quadra pelo nome ("Quadra 1"); id desconhecido sai como está.
   - Campos com `;`, aspas ou quebra de linha vão entre aspas, com aspas internas duplicadas.
   - **Injeção de fórmulas**: célula de texto que começa com `=`, `+`, `-`, `@`, tab ou retorno de carro ganha um apóstrofo no início.
4. **`AdminFinanceiroPage.tsx`**:
   - KPIs pelo `calcularResumoFinanceiro`; gráfico de 7 dias, totais por quadra e lista de auditoria partem de `filtrarReservasFinanceiras` e usam `valorBrutoReserva`.
   - Botão **"Exportar CSV"** exporta a lista **atualmente filtrada** na tela (filtro de tipo e busca), com nome `reservei-financeiro-AAAA-MM-DD.csv` (data local de hoje). Download por `Blob` + `URL.createObjectURL`, liberando a URL depois.
   - Lista vazia: botão desabilitado, com a dica "Nenhuma reserva na lista para exportar".
5. **`AdminDashboardPage.tsx`**: ocupação por `calcularTaxaOcupacao(reservasHoje, QUADRAS.length, HORARIOS_DISPONIVEIS.length)`; sinais recebidos e pendente no local pelo `calcularResumoFinanceiro(reservasHoje)`.

## Casos de borda
- Reserva `pendente` com sinal: entra no recebido e o saldo entra no "a receber".
- Bloqueio: fora do recebido, previsto, bruto, gráfico, lista e CSV; reduz a capacidade da ocupação.
- Reserva `em_processamento`: fora de tudo, inclusive da ocupação (a reserva provisória expira em 10 minutos).
- Escolinha com `valorTotal = 0`: não soma dinheiro, mas ocupa horário.
- Dois registros no mesmo horário e quadra: o horário conta uma vez.
- Todas as quadras bloqueadas o dia inteiro: capacidade zero, ocupação 0%.
- Campo numérico `NaN` ou ausente: conta 0.
- Nome com acento, `;`, aspas, quebra de linha ou começando com `=HYPERLINK(...)`: sai escapado.
- Lista vazia: CSV só com o cabeçalho; na tela, botão desabilitado.

## Testes
- Vitest `tests/lib/financeiro/calculosFinanceiros.test.ts`: filtro, resumo com cenário montado à mão, valor bruto, ocupação (bloqueio, duplicata, capacidade zero, limite de 100) e CSV (BOM, cabeçalho, formatação, escape, injeção de fórmula, lista vazia, sem CPF).
- Vitest `tests/components/admin/AdminFinanceiroPage.test.tsx`: KPI de recebido inclui a reserva `pendente` e ignora bloqueio; exportação gera o `Blob` da lista filtrada com o nome do arquivo; botão desabilitado com lista vazia.
- Vitest do dashboard: ocupação com 3 quadras × 14 horários e bloqueio reduzindo a capacidade.

## Critérios de aceitação
- Valores do financeiro batem com o cenário montado à mão no teste.
- CSV abre no Excel com acentos e colunas corretas.
- `npm run lint`, `npm run typecheck` e `npm test` sem erros.

## Fora do escopo
- Alterar o `financeiro` de `useReservasService.ts`.
- Exportar em outros formatos (XLSX, PDF) ou filtrar por período.
- Conciliação com pagamentos reais (o Pix é simulado).
