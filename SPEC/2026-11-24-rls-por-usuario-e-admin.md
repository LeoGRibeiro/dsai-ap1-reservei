# Especificação: Regras de acesso (RLS) por usuário e por administrador

## Objetivo
Fazer o banco decidir quem lê e altera cada dado, em vez de confiar na tela. Hoje qualquer pessoa com a chave pública (que vai no código do site) lê e altera tudo.

## Problemas comprovados
1. **Todas as policies são `USING (true)`** (`supabase/migrations/20261117000000_schema_base.sql`): reservas, usuários, contratos, interesses em vagas, fidelidade, galeria, escolinhas e upload de imagens.
2. **Dados pessoais públicos**: `fetchReservasSupabase` (`src/lib/supabase/reservasService.ts`) baixa todas as reservas, com nome, WhatsApp e CPF de todos os clientes, para montar a grade do portal.
3. **Qualquer visitante altera qualquer coisa**: cancelar a reserva de outra pessoa, desbloquear a própria conta (`usuarios.bloqueado`), gerar selos e vouchers de fidelidade para si, trocar fotos da landing.
4. **Bloqueio só na tela**: `isTelefoneBloqueado` é consultado pelo navegador; uma chamada direta à API cria a reserva mesmo com o cliente bloqueado.
5. **Telefone editável no perfil**: o "Minha Conta" permite trocar o telefone, mas desde `SPEC/2026-11-24-login-cliente-supabase-auth.md` o telefone é o login; trocar só o perfil deixaria o login no número antigo.

## Decisões
### Identidade
- Dono de uma reserva: quem a criou (coluna nova `reservas.criado_por UUID DEFAULT auth.uid()`, preenchida pelo banco) ou o cliente vinculado (`user_id = auth.uid()::text`). Visitante sem conta tem sessão anônima (spec do login do cliente), então também é dono das reservas que cria.
- Administrador: `public.is_admin()` (spec do login do admin).

### Por tabela
| Tabela | Público / visitante | Cliente (dono) | Admin |
|---|---|---|---|
| `reservas` | só a visão `reservas_publicas` | lê e altera as próprias, com as restrições abaixo | tudo |
| `reservas_horarios` | leitura (sem dados pessoais) e Realtime | igual | igual |
| `usuarios` | nada; `telefone_bloqueado(telefone)` devolve só sim ou não | lê e edita o próprio perfil, sem `bloqueado`, `motivo_bloqueio` e telefone | tudo |
| `contratos_recorrentes` | só a visão `contratos_publicos` | igual ao público | tudo |
| `interesses_vagas` | nada | registra o próprio interesse em reserva com vagas abertas; vê os próprios; o dono da reserva vê, aceita ou recusa os interessados | tudo |
| `fidelidade_campanha` | leitura | leitura | tudo |
| `fidelidade_selos` | nada | lê os próprios; cria selo só de reserva sua, não cancelada e já jogada | tudo |
| `fidelidade_vouchers` | nada | lê, cria e marca como usados os próprios | tudo |
| `landing_page_gallery`, `landing_page_schools`, bucket `institucional` | leitura | leitura | escrita |

### Visões públicas (sem dados pessoais)
- `reservas_publicas`: reservas não canceladas a partir de ontem (as canceladas só quando são de contrato, para os avisos de cancelamento da grade), com quadra, data, horários, status, tipo, contrato, vagas, esporte e prazo. Nome, WhatsApp e observações só aparecem em bloqueios do admin e em reservas de escolinha (dados do próprio complexo e da escolinha, que a grade já mostra para matrícula). Nunca CPF.
- `contratos_publicos`: contratos ativos sem `responsavel_nome` e `contato_whatsapp`, exceto nas escolinhas (contato de matrícula, público por regra dos autores: "integração direta com WhatsApp para matrículas").

### Restrições ao cliente em `reservas` (trigger)
- Na criação: só `em_processamento`, tipo avulsa, sem contrato e sem vincular a outra conta. Cliente bloqueado não cria reserva (`usuario_bloqueado`).
- Na alteração: não muda quadra, data, horários, tipo, contrato nem `criado_por` (`alteracao_nao_permitida`).
- Status só avança por caminhos do cliente: provisória para paga (`pendente` ou `confirmada`) ou cancelada; paga para cancelada.
- Valores e vouchers só mudam enquanto a reserva é provisória (checkout).
- Vincular conta (`user_id`) só para a própria; tentativa de vincular a outra é ignorada, sem quebrar o restante da alteração.
- WhatsApp de cliente bloqueado informado no checkout: `usuario_bloqueado`.
- Excluir: só a própria reserva provisória (cancelar o checkout).

### Perfil
- Trigger em `usuarios`: quem não é admin não altera `bloqueado`, `motivo_bloqueio`, `telefone` nem `id` (`alteracao_nao_permitida`).
- O campo telefone do "Minha Conta" fica somente leitura, com a orientação de pedir a troca ao complexo.

### MCP (agente)
- Função `criar_reserva_agente(quadra, data, horarios, nome, whatsapp, esporte)`: valida os dados, calcula o preço com as faixas do sistema (08h–11h R$ 70, 12h–17h R$ 90, 18h–21h R$ 110; sinal de 40%) e grava como `pendente`, igual à reserva manual não paga do admin. A garantia de horário da reserva atômica continua valendo.
- Disponibilidade pela visão `reservas_publicas`.
- Buscar reservas pelo telefone deixa de funcionar com a chave pública, porque expunha os dados de qualquer pessoa. O ajuste do servidor MCP fica com a tarefa JN-01 do Jonathan.

### App
- `fetchReservasSupabase` junta as reservas que a sessão pode ver (todas para o admin, as próprias para o cliente) com `reservas_publicas`; a versão completa prevalece. Mesmo padrão para contratos.
- A grade do portal se atualiza ao vivo por `reservas_horarios`, recarregando a visão pública.
- `isTelefoneBloqueado` usa `telefone_bloqueado()`.
- Erro `usuario_bloqueado` vira mensagem na tela.

## Limitações conhecidas (registradas no `BACKLOG.md`)
- O pagamento é simulado: o navegador ainda informa os valores da reserva no checkout. O cálculo do preço no banco fica para quando houver pagamento real.
- A emissão de voucher continua confiando no app (só o dono pode emitir para si). Gerar selos e vouchers no banco fica no backlog.
- Tabelas novas do Jonathan (configurações, FAQ, notificações, Instagram) recebem as regras numa migração posterior, depois que o bloco dele for integrado.

## Casos de borda
- Visitante sem sessão (login anônimo desligado): só lê as visões públicas; não consegue gravar reserva e vê a mensagem de falha.
- Admin logado no portal: vê todas as reservas completas.
- Cliente cancela uma reserva criada pelo admin no nome dele (`user_id` dele): permitido.
- Organizador abre vagas na própria reserva paga: permitido (só `permite_vagas` e `vagas_abertas`).
- Interessado em reserva sem vagas abertas ou de outro dono: recusado.
- Expiração da reserva provisória de outra pessoa pelo trigger da reserva atômica continua funcionando (roda com o dono da tabela).

## Testes
- SQL (`supabase/tests/rls.sql`), executando como `anon` e `authenticated` com sessões simuladas: cada linha da tabela de acesso, as restrições do trigger, as visões sem dados pessoais e `criar_reserva_agente` (preço, sinal e horário ocupado).
- Vitest: junção das reservas próprias com as públicas, recarga pela mudança de horários, `telefone_bloqueado`, mensagem de usuário bloqueado e telefone somente leitura no perfil.

## Critérios de aceitação
- Com a chave pública e sem sessão, `GET /rest/v1/reservas` e `GET /rest/v1/usuarios` devolvem lista vazia.
- Cliente não lê nem altera reserva, perfil, selo ou voucher de outro cliente.
- Grade do portal, checkout, Minha Conta, mural de vagas e painel admin continuam funcionando.
- CI verde, com cobertura das linhas novas acima de 70%.
