# Sistema de Fidelidade

## Resumo
O Sistema de Fidelidade visa aumentar a retenção e a recorrência dos clientes da arena, premiando-os após um número específico de **horas jogadas** concluídas dentro de um período de tempo (ex: 3 meses). 
A recompensa será automatizada através da geração de um "Voucher" que pode ser usado para abater parcial ou integralmente o valor de uma nova reserva, com base no ticket médio gasto pelo cliente para conquistar o prêmio.

## Regras de Negócio Definidas

1. **Condição para Ganhar o "Selo" (Carimbo)**
   - O selo de progresso só é concedido **após a data/hora do jogo ter passado** e o status financeiro da reserva estar **pago**. 
   - Isso evita o cenário de agendamento fraudulento apenas para ganho de selos, seguido de cancelamento/estorno.

2. **Tipos de Reservas Contabilizadas**
   - **Apenas Reservas Avulsas.** 
   - Reservas de mensalistas não entram na contagem, pois o perfil de mensalista já conta com benefícios e tabelas de preços exclusivas negociadas à parte.

3. **Cálculo da Recompensa (Teto pelo Ticket Médio)**
   - Ao completar a cartela de `X` horas jogadas no período de `Y` meses, o sistema não dá simplesmente "uma quadra de graça", mas sim um voucher de desconto.
   - O valor do voucher é limitado à **Média de Valor** por hora que o cliente gastou nas `X` horas que geraram o prêmio.
   - *Exemplo:* Se o cliente acumulou 12 horas com um ticket médio de R$ 100/hora (gastou R$ 1200 no total), a média é R$ 100. O voucher gerado terá o valor de abatimento máximo de R$ 100.
   - No uso do voucher:
     - Se o cliente agendar num horário de R$ 80, a reserva sai de graça (desconto de R$ 80).
     - Se o cliente agendar num horário de R$ 150 (horário nobre), o sistema abate R$ 100, e ele paga a diferença de R$ 50.
     - Isso cria um equilíbrio justo para a arena e evita o "golpe do horário nobre".

4. **Janela de Tempo (Expiração)**
   - O progresso possui uma janela de validade (ex: 3 meses). Selos gerados fora dessa janela expiraram, criando o senso de urgência ("Complete seus jogos antes que os selos expirem!").

5. **Automação no Checkout e Modal de Confirmação**
   - O usuário não precisará "entrar em contato com a arena" para solicitar a gratuidade.
   - O voucher de fidelidade ficará atrelado ao perfil dele.
   - O seletor para aplicar o(s) voucher(s) deve estar presente com alta visibilidade tanto no Carrinho Lateral quanto **diretamente no modal de Confirmação de Reserva (`FormularioIdentificacao`)**, antes da escolha do meio de pagamento.
   - Se a reserva for 100% coberta pelos vouchers (`valorFinal = R$ 0,00`), o fluxo não deve exigir Pix, exibindo o botão "Confirmar Reserva Gratuita 🎉" e confirmando imediatamente.

6. **Uso de Vouchers: Flexibilidade Individual ou Combinada**
   - O cliente pode optar por usar seus vouchers **separadamente** (apenas um por reserva) ou **combiná-los** livremente conforme sua conveniência.
   - O seletor de checkout permite marcar e desmarcar cada voucher individualmente.
   - O abatimento concedido corresponde à soma dos tetos dos vouchers selecionados: `min(valorTotalReserva, somaTetosSelecionados)`.
   - Ao confirmar a reserva (gratuita ou complementada via Pix), **apenas os vouchers efetivamente selecionados** são consumidos e vinculados à reserva (`status = 'utilizado'`).
   - Os vouchers não selecionados permanecem ativos com status `disponivel` para agendamentos posteriores dentro de seus respectivos prazos de validade.


## Impacto na Arquitetura

### Banco de Dados (Entidades Previstas)
- `FidelityCampaign`: Configurações da arena (ex: `required_hours` = 12, `months_validity` = 3).
- `UserFidelityProgress`: Os "selos" (horas) atuais que o usuário tem ativos e o valor pago em cada slot (para facilitar o cálculo do ticket médio no final). Relacionado à reserva original. Se uma reserva tiver 2 horas, ela gera 2 selos ou um registro com quantidade = 2.
- `Vouchers`: Nova entidade no sistema (ou adaptação, se já existir um sistema de cupons). Precisa de campos: `user_id`, `max_discount_value`, `status` (ativo/usado/expirado), `valid_until`.

### Fluxos (Hooks e Workers)
- Precisaremos implementar um *Observer* ou lógica no serviço que marca uma Reserva como "Concluída". 
  - Ao marcar como concluída, verifica se a reserva é avulsa, se não pertence a uma cartela já fechada e insere a quantidade de horas correspondente no `UserFidelityProgress`.
  - Se completou `X` horas ativas, calcula a média, gera o `Voucher` e notifica o usuário (via push, email ou notificação interna na timeline).

### UI (Interfaces)
- **Portal do Cliente:**
  - Seção de "Minha Fidelidade" com uma timeline visual ou "cartela de carimbos" mostrando os selos, quanto falta, e a validade de cada selo.
  - Tela de Pagamento/Checkout: Inclusão do seletor/botão de "Usar recompensa".
- **Painel Admin:**
  - Tela para configurar a campanha de fidelidade da arena.
  - Relatório de recompensas geradas/utilizadas.
