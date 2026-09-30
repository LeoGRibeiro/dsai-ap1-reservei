# 1. O quê e por quê

O sistema é uma plataforma web responsiva (mobile-first) de gestão e locação de espaços esportivos (um complexo com múltiplas quadras fictícias).

O objetivo é digitalizar o processo de agendamento, impedindo conflitos de horários (double booking) e fornecendo um painel de controle administrativo completo (incluindo gestão financeira).

# 2. Decisões de Arquitetura e Stack

**Front-end**: React utilizando Next.js (App Router).

**Estilização e UI**: Tailwind CSS combinado com uma biblioteca de componentes ricos (como shadcn/ui ou Material UI) para acelerar a criação de tabelas, modais e formulários.

**Armazenamento/Estado**: Uso de Context API ou Zustand para gerenciar o estado global das reservas e do caixa, simulando um banco de dados persistente no LocalStorage para que as ações dos clientes reflitam instantaneamente no painel Admin.

# 3. Critérios de aceitação

**Visões**: O sistema deve possuir duas visões distintas: Portal do Cliente (vitrine e agendamento) e Dashboard Admin (gestão de ocupação e tela de valores ganhos/previstos).

**Integração de Estado**: Ao clicar em "Simular Sucesso" no fluxo de pagamento mockado, o horário deve ser bloqueado imediatamente para outros usuários e a reserva deve aparecer no calendário do Admin.

**Financeiro**: O valor da reserva confirmada deve ser somado instantaneamente aos relatórios de ganho/previsão no Dashboard Admin.

**Responsividade**: A interface deve se adaptar perfeitamente a telas de celulares.

# 4. Fora do escopo

Integração real com gateways de pagamento ou bancos. O fluxo financeiro exibirá um QR Code Pix falso com botões de ação ("Simular Sucesso" e "Cancelar") que disparam as mudanças de estado da aplicação.

Aplicativo mobile nativo (iOS/Android).

Sistema algorítmico de balanceamento ou formação de times.
