# 1. O quê e por quê

Criação do Portal do Cliente, contendo o fluxo completo de agendamento (calendário, seleção, carrinho e formulário de identificação) sem necessidade de login.

O objetivo é guiar o usuário em um funil de conversão intuitivo (mobile-first), com regras estritas de seleção e pagamento de sinal para evitar desistências, garantindo que a reserva reflita imediatamente no sistema.

# 2. Arquitetura e Atualizações Necessárias

**Abstração de Banco de Dados**: Embora usemos Zustand + LocalStorage agora, a interface não deve consumir o Zustand diretamente. O estado deve ser acessado por uma camada de abstração (ex: Padrão Repository ou custom hooks), preparando o terreno para um banco de dados real no futuro.

**Constantes**: Centralizar regras de negócio (ex: `PERCENTUAL_SINAL = 0.40`, `TOLERANCIA_CANCELAMENTO = 24h` e preços dinâmicos: Manhã 08h-12h R$70 | Tarde 12h-18h R$90 | Noite 18h-22h R$110).

A modelagem da reserva ganha os campos: `valorSinal`, `valorPendente`, `nome`, `whatsapp`, `cpf` e `statusWhatsApp`.

# 3. Critérios de aceitação da UI e Fluxo

**Calendário**: Seleção de datas restrita a hoje + 7 dias no futuro.

**Layout e Seleção**:
- O layout deve exibir no topo os dias do mês de forma horizontal. Abaixo do dia selecionado, liste todas as quadras verticalmente.
- Para cada quadra, exiba imediatamente a lista de horários disponíveis logo abaixo do nome dela (sempre expandido, sem acordeão e sem textos extras desnecessários de descrição).
- O valor da hora por faixa (Manhã: R$ 70 / hora, Tarde: R$ 90 / hora, Noite: R$ 110 / hora) deve ter tipografia destacada e bem legível.
- Cada quadra possui disponibilidade independente de horários. A seleção de um horário em uma quadra NÃO bloqueia aquele mesmo horário nas outras quadras. O cliente seleciona horários em uma única quadra por pedido.
- Múltiplos horários só podem ser selecionados se forem estritamente consecutivos (ex: 13h, 14h, 15h).
- Validação de horário limite: O cliente só pode selecionar um horário até 10 minutos antes do seu início, e só pode concluir o pagamento até 1 minuto antes do início do horário. Horários passados no dia atual não devem estar disponíveis.

**Carrinho Lateral e Mobile**: Atualização em tempo real mostrando endereço, dia, horas, quadra e valor total dinâmico. No desktop/tablet (>= 768px), fica fixado como painel lateral à direita e o botão flutuante permanece oculto. No mobile (< 768px), o botão flutuante 'Ver reserva' é exibido no rodapé e abre a gaveta inferior (Sheet) com espaçamento e padding horizontal dedicados.

**Lock Temporário**: Ao clicar em "Continuar", salva a reserva na store como "em_processamento", bloqueando a visualização destes horários para que ninguém mais os pegue durante o preenchimento.

**Modal de Confirmação e Identificação**:
- Exibe o resumo do carrinho replicado no lado direito (em desktop) para relembrar todas as informações da reserva (quadra, data, horários, valor total).
- Fornece previamente as opções claras de pagamento: "Pagar apenas o Sinal (40%)" ou "Pagar Valor Integral (100%)", com os valores correspondentes discriminados, e o botão de ir para pagamento posicionado logo abaixo do resumo e valor a ser pago.
- No lado esquerdo, solicita Nome, WhatsApp e CPF, esporte e observações opcionais, além dos termos de cancelamento e o aviso explícito: "A confirmação da sua reserva será enviada pelo WhatsApp.".

**Regras Financeiras e Modal Pix**:
- Ao avançar para o pagamento, o Modal Pix apresenta o QR Code e código Pix já com o valor exato previamente selecionado (sinal ou integral), sem alternância confusa sobre o QR Code.
- Os campos valorSinal e valorPendente devem ser gravados na Store com base nessa escolha.
- Modal de Pix com botão "Simular Pagamento".
- Ao confirmar, a reserva muda para "confirmada" e a UI dispara um Toast verde com a mensagem correspondente (ex: "Mensagem enviada no WhatsApp. Pagamento integral confirmado!" ou "Mensagem enviada... Sinal confirmado, restante no local.").

**Atualização Imediata (Vitrine)**: Ao fechar o aviso de sucesso, a tela do calendário deve refletir imediatamente aqueles horários como ocupados/indisponíveis na quadra reservada (sem afetar as demais quadras que continuam livres naquele mesmo horário).

**Integração Admin**: A reserva deve ser persistida de forma que o Dashboard Admin (que será feito na próxima spec) já consiga ler os dados, emitir avisos de nova reserva e contabilizar os valores no painel financeiro.

# 4. Fora do escopo

- Banco de dados real.
- Integração real com WhatsApp.
- Sistema de Login para o cliente final.
