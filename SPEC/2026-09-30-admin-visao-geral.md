# Dashboard Admin - Visão Geral

## 1. O quê e por quê

Criação da infraestrutura base e do layout do Dashboard Administrativo.

O objetivo é estabelecer uma área restrita e segura onde o gestor do complexo esportivo poderá monitorar a operação de forma centralizada.

## 2. Arquitetura e Estrutura

- **Autenticação Mockada:** Uma tela de login interceptando a rota de administração (ex: `/admin`). A verificação será puramente no front-end: se a senha digitada for "admin123", o sistema salva uma flag no LocalStorage e libera o acesso.
- **Layout Wrapper:** Um componente de estrutura com uma Sidebar (Menu Lateral) responsiva, contendo os links de navegação: "Dashboard", "Agenda de Ocupação" e "Financeiro".
- **Consumo de Dados:** O painel consumirá a nossa camada de abstração de estado (Zustand/Service) para exibir dados sincronizados em tempo real com as ações feitas no Portal do Cliente.

## 3. Critérios de aceitação

- Ao acessar a rota `/admin`, o sistema deve bloquear a visualização e renderizar a tela de login.
- Após o login bem-sucedido, redirecionar para a "Visão Geral" (`/admin/dashboard`).
- A página "Visão Geral" deve conter uma grade de Cards de Resumo (KPIs) mostrando:
  - Número de reservas totais (do dia atual).
  - Valor total de sinais pagos/confirmados.
  - Valor total pendente a receber no local.
- O layout deve se adaptar ao mobile (Sidebar recolhível em menu hambúrguer).
- Um botão de "Sair" que remove o acesso do LocalStorage e devolve para a tela de login.

## 4. Fora do escopo

- Implementação detalhada das páginas de "Agenda de Ocupação" e "Financeiro" (serão alvo das próximas especificações).
- Autenticação real com backend (JWT, sessões no servidor, OAuth).
- Múltiplos níveis de hierarquia de usuários (haverá apenas um perfil global de administrador).
