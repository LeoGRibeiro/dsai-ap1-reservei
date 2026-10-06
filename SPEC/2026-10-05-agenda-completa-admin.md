# Dashboard Admin - Agenda Completa (Calendário Mensal)

## 1. O quê e por quê

Implementação de uma visualização completa da agenda do complexo para o Administrador, em formato de **Calendário Mensal**. Diferente da "Timeline" (que foca no acompanhamento operacional contínuo de um único dia), esta agenda permite ter uma visão panorâmica de todo o mês, incluindo histórico (reservas passadas) e projeções futuras (até 6 meses).

O objetivo é centralizar as operações de agendamento manual (clientes via telefone/WhatsApp) e o bloqueio de quadras (para manutenção, chuva, etc.), garantindo controle total ao gestor sobre toda a malha de horários.

## 2. Critérios de aceitação

- **Visualização Mensal:** O calendário deve exibir um mês completo (em formato de grid de dias tradicionais de calendário).
- **Navegação Temporal:** Deve ser possível retroceder para ver o histórico e avançar até 6 meses no futuro.
- **Detalhes do Dia (Visão Clara e Simplificada):** Ao clicar em um dia específico no calendário mensal, deve abrir uma visualização detalhada daquele dia (semelhante à grade/lista já utilizada pelo usuário final). Isso garante um panorama geral de horários livres e ocupados sem a complexidade visual da Timeline.
- **Reserva Manual pelo Admin:** Na visão do dia, o administrador deve poder selecionar um horário livre e criar uma reserva manualmente.
  - O formulário deve incluir: Nome do cliente (ou grupo), Contato, Status de Pagamento (Pago/Não Pago) e Observações.
  - As reservas criadas manualmente pelo admin devem ter um **destaque visual diferente** na agenda (ex: cor ou ícone específico) para diferenciá-las de reservas feitas online de forma autônoma pelos clientes.
- **Bloqueio de Horários (Manutenção e Outros):** O admin pode bloquear horários específicos.
  - Um bloqueio impede que qualquer cliente, ou mesmo o sistema de reservas manuais, ocupe aquele slot de horário.
  - Para o usuário final, o horário aparecerá simplesmente como "Ocupado/Indisponível".
  - Para o admin, exibirá a etiqueta e motivo do "Bloqueio".
  - Importante: Bloqueios **não entram nas métricas financeiras/relatórios de faturamento**.
- **Prevenção de Conflitos no Bloqueio:** O sistema deve **impedir** o admin de bloquear um horário que já possua uma reserva confirmada. O admin receberá um alerta e deverá gerenciar a reserva existente (entrar em contato com o cliente e remover a reserva) antes de poder efetuar o bloqueio daquele horário.
- **Botão Rápido de Pagamento:** Nos detalhes de qualquer reserva (ao clicar sobre o bloco na agenda), deve existir um botão direto de **"Marcar como Pago"** para agilizar o fluxo de caixa no balcão físico.

## 3. Aspectos Técnicos e de Arquitetura

- **Arquitetura de Entidade Única:** "Reserva de Cliente", "Reserva Manual do Admin" e "Bloqueio" utilizarão a mesma estrutura básica de evento no tempo, sendo diferenciados primordialmente por um atributo (ex: campo de `tipo`). Isso centraliza lógicas de validação de choque de horários num único módulo.
- **Performance e Lazy Loading:** O carregamento de dados será feito sob demanda (mês a mês) consumindo diretamente a API/Banco de dados real, de modo que apenas os dados do mês renderizado na tela sejam trafegados, visando otimização.
