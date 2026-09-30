# 1. O quê e por quê

Criação do Portal do Cliente, contendo o fluxo completo de agendamento (calendário, seleção, carrinho e formulário de identificação) sem necessidade de login.

O objetivo é guiar o usuário em um funil de conversão intuitivo (mobile-first), com regras estritas de seleção e pagamento de sinal para evitar desistências, garantindo que a reserva reflita imediatamente no sistema.

# 2. Arquitetura e Atualizações Necessárias

**Abstração de Banco de Dados**: Embora usemos Zustand + LocalStorage agora, a interface não deve consumir o Zustand diretamente. O estado deve ser acessado por uma camada de abstração (ex: Padrão Repository ou custom hooks), preparando o terreno para um banco de dados real no futuro.

**Constantes**: Centralizar regras de negócio (ex: `PERCENTUAL_SINAL = 0.40`, `TOLERANCIA_CANCELAMENTO = 24h` e preços dinâmicos: 08-12h R$70, 12-17h R$90, 17-22h R$110).

A modelagem da reserva ganha os campos: `valorSinal`, `valorPendente`, `nome`, `whatsapp`, `cpf` e `statusWhatsApp`.

# 3. Critérios de aceitação da UI e Fluxo

**Calendário**: Seleção de datas restrita a hoje + 7 dias no futuro.

**Layout e Seleção**:
- O layout deve exibir no topo os dias do mês de forma horizontal. Abaixo do dia selecionado, liste todas as quadras verticalmente.
- Para cada quadra, exiba imediatamente a lista de horários disponíveis logo abaixo do nome/descrição dela (sempre expandido, sem acordeão).
- Ao selecionar um horário em uma quadra, as demais quadras ficam desabilitadas para aquele dia/hora.
- Múltiplos horários só podem ser selecionados se forem estritamente consecutivos (ex: 13h, 14h, 15h).

**Carrinho Lateral**: Atualização em tempo real mostrando endereço, dia, horas, quadra e valor total dinâmico.

**Lock Temporário**: Ao clicar em "Continuar", salva a reserva na store como "em_processamento", bloqueando a visualização destes horários para que ninguém mais os pegue durante o preenchimento.

**Formulário de Identificação**: Solicita Nome, WhatsApp e CPF. Exibe os termos de cancelamento e o aviso explícito: "A confirmação da sua reserva será enviada pelo WhatsApp.". O campo de observações possui o placeholder genérico: "Observações adicionais (opcional)".

**Regras Financeiras e Checkout Mockado**:
- No modal de pagamento/carrinho, há duas opções claras de escolha: "Pagar apenas o Sinal (40%)" ou "Pagar Valor Integral (100%)". O valor cobrado no Pix reflete a escolha.
- Os campos valorSinal e valorPendente devem ser atualizados na Store com base nessa escolha.
- Modal de Pix com botão "Simular Pagamento".
- Ao confirmar, a reserva muda para "confirmada" e a UI dispara um Toast verde com a mensagem correspondente (ex: "Mensagem enviada no WhatsApp. Pagamento integral confirmado!" ou "Mensagem enviada... Sinal confirmado, restante no local.").

**Atualização Imediata (Vitrine)**: Ao fechar o aviso de sucesso, a tela do calendário deve refletir imediatamente aqueles horários como ocupados/indisponíveis (sem mostrar os dados de quem reservou).

**Integração Admin**: A reserva deve ser persistida de forma que o Dashboard Admin (que será feito na próxima spec) já consiga ler os dados, emitir avisos de nova reserva e contabilizar os valores no painel financeiro.

# 4. Fora do escopo

- Banco de dados real.
- Integração real com WhatsApp.
- Sistema de Login para o cliente final.
