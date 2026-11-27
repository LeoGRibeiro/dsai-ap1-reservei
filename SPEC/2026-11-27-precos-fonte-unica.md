# Especificação: Regras de preço e sinal com uma única fonte de verdade (JN-01)

## Objetivo
O site e o servidor MCP calculam exatamente o mesmo valor por hora, valor total, sinal e pendente, e isso é garantido por teste nas duas linguagens a partir de uma mesma fixture.

## Problemas comprovados
1. **Comentários contradizem o código** (`src/lib/constants.ts`): `calcularValorHora` aplica manhã 08-11h (R$ 70), tarde 12-17h (R$ 90) e noite 18-21h (R$ 110), como manda `SPEC/2026-09-30-portal-cliente.md`. Mas `PRECOS` comenta "TARDE 12:00 – 16:59" e "NOITE 17:00 – 21:59", e o JSDoc diz "tarde (12-16h) | noite (17-22h)". O código está certo; os comentários, errados.
2. **Horário fora da grade vira "noite"**: `calcularValorHora("07:00")` devolve R$ 110 em vez de recusar o horário.
3. **Constante morta**: `VALOR_HORA = 90` em `src/lib/quadras.ts` não é usada pela aplicação web.
4. **MCP cobra outro preço** (`mcp_server/reservei_mcp/server.py`): `VALOR_HORA = 90.0` fixo, sinal de **50%** (`round(valor_total * 0.5, 2)`) e reserva gravada como `"confirmada"` sem pagamento. Uma reserva das 19h custa R$ 110 no site e R$ 90 pelo MCP.
5. **MCP incompatível com a RLS** (`SPEC/2026-11-24-rls-por-usuario-e-admin.md`): com a chave pública, o MCP não lê nem grava mais a tabela `reservas`. O `POST /rest/v1/reservas` e o `GET /rest/v1/reservas` falham.

## Decisões
1. **Fixture compartilhada** `tests/fixtures/regras-preco.json` é a fonte de verdade dos casos de referência. Os testes TypeScript (`tests/lib/precos/regrasPreco.test.ts`) e Python (`tests/test_mcp_precos.py`) leem o mesmo arquivo.
2. **Horário fora da grade é erro explícito**, igual a `valor_hora_quadra` do banco (`horario_invalido`):
   - TS: `calcularValorHora` lança `RangeError` quando o horário não está no formato `HH:00` ou fica fora de 08:00–21:00.
   - Python: `calcular_valor_hora` lança `ValueError` nos mesmos casos.
   - Nenhuma chamada atual passa horário fora da grade (todas vêm de `HORARIOS_DISPONIVEIS`).
3. **Arredondamento idêntico**: o JS usa `Math.round(valor * 100) / 100` (meio centavo para cima). O Python não usa `round()` (arredondamento bancário); usa `math.floor(valor * 100 + 0.5) / 100`, que dá o mesmo resultado para valores positivos.
4. **Módulo de preço do MCP** `mcp_server/reservei_mcp/precos.py`: `calcular_valor_hora`, `calcular_valor_total`, `calcular_sinal` e `calcular_pendente`, espelhando `constants.ts`. Serve para **mostrar** o valor ao usuário; com Supabase, quem grava o valor é o banco.
5. **Criação de reserva pelo MCP**:
   - Com Supabase configurado: `POST /rest/v1/rpc/criar_reserva_agente` com `p_quadra_id`, `p_data`, `p_horarios`, `p_nome`, `p_whatsapp`, `p_esporte`. O banco valida, calcula o preço (70/90/110, sinal de 40%), grava como `pendente` e devolve o id.
   - Erros do banco traduzidos para mensagens claras: `horario_ocupado`, `horarios_nao_consecutivos`, `horario_invalido`, `usuario_bloqueado`, `dados_invalidos`; qualquer outro vira uma mensagem genérica de falha.
   - Sem Supabase (modo local): grava em memória com os valores de `precos.py` e status `pendente`.
   - A mensagem de retorno passa a dizer "Status: PENDENTE (sinal de 40% a confirmar)" em vez de "CONFIRMADA".
6. **Disponibilidade pelo MCP**: lê a visão `reservas_publicas` (sem dados pessoais) em vez de `reservas`. Reserva `em_processamento` com `expira_em` vencido não ocupa o horário, como na grade do site (`reservaOcupaHorario`). A legenda de preço mostra as três faixas em vez de "R$ 90/h".
7. **`buscar_reservas_cliente`**: consultar reservas por telefone com a chave pública exporia os dados de qualquer pessoa, e a RLS impede. A ferramenta continua existindo (clientes MCP já a conhecem), mas responde que a consulta é feita no site, em "Minha Conta". Registrado no `BACKLOG.md`.
8. **`VALOR_HORA`**: removido de `src/lib/quadras.ts` (sem uso) e de `reservei_mcp/server.py`. O ponto de entrada legado `mcp_server/server.py` deixa de importá-lo.
9. **Comentários de `constants.ts`** corrigidos para as faixas reais, sem mudar comportamento (além da decisão 2).

## Casos de borda
- `"07:00"`, `"22:00"`, `"8:00"`, `"18:30"` e texto vazio: erro explícito nas duas linguagens.
- Limites das faixas: `"11:00"` = 70, `"12:00"` = 90, `"17:00"` = 90, `"18:00"` = 110, `"21:00"` = 110.
- Arredondamento: R$ 70 × 40% = 28,00; R$ 270 × 40% = 108,00; total com dízima (R$ 33,33 → sinal 13,33 e pendente 20,00; R$ 99,99 → sinal 40,00 e pendente 59,99).
- Conferido contra `criar_reserva_agente`: 19h → total 110, sinal 44, pendente 66.
- Lista de horários vazia: total 0, sinal 0, pendente 0.
- Resposta de erro do PostgREST sem JSON válido: mensagem genérica, sem exceção.
- Reserva provisória vencida na visão pública: horário aparece livre no MCP.

## Testes
- Vitest `tests/lib/precos/regrasPreco.test.ts`: todos os casos da fixture para `calcularValorHora`, `calcularValorTotal`, `calcularValorSinal` e `calcularValorPendente`, incluindo horários inválidos.
- Pytest `tests/test_mcp_precos.py`: os mesmos casos da fixture para as funções Python.
- Pytest do servidor MCP (com `requests` simulado): `criar_reserva` chama a RPC com os parâmetros certos e mostra status pendente; cada erro do banco vira a mensagem correspondente; disponibilidade lê `reservas_publicas` e ignora provisória vencida; `buscar_reservas_cliente` orienta a usar o site e não chama o banco.

## Critérios de aceitação
- Os testes TypeScript e Python passam com a mesma fixture.
- Uma reserva das 19h criada pelo MCP é enviada a `criar_reserva_agente`, que grava `valor_total = 110`, `valor_sinal = 44` e `status = "pendente"`.
- `npm run lint`, `npm run typecheck`, `npm test` e `pytest tests` sem erros.

## Fora do escopo
- Preços configuráveis pelo admin.
- Reserva de vários horários seguidos pelo MCP (a ferramenta continua recebendo um horário).
- Consulta de reservas do cliente pelo MCP com autenticação (ver `BACKLOG.md`).
