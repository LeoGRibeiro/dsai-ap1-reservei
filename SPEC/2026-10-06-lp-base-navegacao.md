# Especificação: Landing Page - Base e Navegação

## 1. Visão Geral
Transformação da tela inicial do Portal do Cliente em uma Landing Page "Single Page Application" (SPA) com rolagem fluida. O objetivo é criar uma primeira impressão de alto impacto, mantendo o fluxo de reservas sempre acessível e intuitivo.

## 2. Componentes Arquiteturais

### 2.1. Header (Cabeçalho Fixo)
- **Comportamento:** Sticky (fixo no topo ao rolar a página), com mudança de estilo (ex: fundo transparente que fica sólido ao rolar).
- **Navegação (Âncoras):** Links que realizam "smooth scroll" para as seções:
  - Início
  - Estrutura
  - Escolinhas
  - Eventos
  - Contato
- **Ações Rápidas:** Botões de "Fazer Login" / "Minha Conta" e um CTA de destaque "Agendar Agora" (que rola a página para a área de reservas).

### 2.2. Seção Principal (Reserva em Primeiro Lugar)
- **Regra de Ouro:** A primeira coisa que o usuário deve ver ao acessar o site é o sistema de reservas (horários e quadras). Nada de banners genéricos ou textos longos empurrando o agendamento para baixo.
- **Visual e Estrutura:**
  - Título curto e direto ao ponto (ex: "Agende sua quadra agora").
  - O fluxo atual de "Nova Reserva" (calendário, horários, mural) já visível e pronto para uso no topo da página.
- **Objetivo:** Garantir que o cliente recorrente não perca nem um segundo rolando a tela para fazer o que mais importa: reservar.

### 2.3. Footer (Rodapé Base)
- Estrutura de rodapé moderno.
- Links rápidos de navegação.
- Assinatura da plataforma (Reservei).
- Links para redes sociais.

## 3. Metas de Design e Refinamento de Rolagem
- Design *premium*, uso de cores da marca, fontes modernas (ex: Inter ou Roboto).
- Responsividade total (Mobile-first).
- **Rolagem Refinada (Smooth Scroll):**
  - Animação com curva suave customizada (`easeInOutCubic`) via `requestAnimationFrame` para transição orgânica e confortável entre as seções.
  - Velocidade proporcional à distância a ser percorrida (`calcularDuracaoRolagem`).
  - Interrupção graciosa caso o usuário intervenha durante a rolagem (roda do mouse ou toque).
  - Botão flutuante "Voltar ao Topo" (`BotaoVoltarAoTopo`) com transição suave e acesso rápido ao fluxo de reserva.

## 4. Banco de Dados / Migrações
- Não há migrações de banco de dados estritamente necessárias para a base estrutural.
