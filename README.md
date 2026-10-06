# Reservei 🏟️

**Dupla:** Leonardo G. Ribeiro e Lucas Reis  
**Disciplina:** Desenvolvimento de Software Apoiado por IA (DSAI) — 2026.4 | Prof. Gustavo Pinto (UFPA)  
**URL de Produção:** [https://dsai-ap1-reservei-lmrotsyzj-leo-gr-ibeiro.vercel.app](https://dsai-ap1-reservei-lmrotsyzj-leo-gr-ibeiro.vercel.app)  

---

## 📖 Visão Geral do Sistema

O **Reservei** é uma plataforma web responsiva de alta performance projetada para digitalizar, automatizar e otimizar a operação completa de complexos esportivos com múltiplas quadras (Beach Tennis, Futevôlei, Futebol Society, Futsal, Tênis, etc.).

A aplicação elimina o problema clássico de conflito de horários (*double booking*), simplifica o fluxo de locação avulsa para clientes finais e oferece um backoffice administrativo robusto para gestão de mensalistas, escolinhas parceiras, controle financeiro de receitas realizadas e previstas, mural de busca de parceiros para partidas e programa de fidelidade gamificado.

> 📚 **Especificações Arquiteturais (SDD):** Toda a arquitetura foi desenhada previamente sob a metodologia *Spec-Driven Development*, versionada na pasta [`SPEC/`](./SPEC/).

---

## 🚀 Principais Módulos e Funcionalidades

### 1. Landing Page Institucional & Experiência de Navegação
* **Header Dinâmico:** Indicador visual de progresso de rolagem, detecção de seção ativa e menu mobile expansível.
* **Navegação Fluida:** Suporte a *Smooth Scroll* integrado via Lenis e atalho rápido "Voltar ao topo".
* **Galeria da Estrutura Física:** Vitrine interativa de fotos das instalações (quadras, vestiários, bar, iluminação LED) com filtros por categoria e modal de visualização em alta resolução (*lightbox*).
* **Escolinhas Esportivas Parceiras:** Exibição de turmas, professores, horários, faixas etárias e integração direta com WhatsApp para matrículas.
* **Localização e Informações de Contato:** Mapa interativo, horários de funcionamento, comodidades e links diretos para suporte.

### 2. Portal do Cliente & Agendamento Ágil
* **Seleção de Quadras & Modalidades:** Filtros inteligentes por tipo de piso e esporte.
* **Grade de Horários em Tempo Real:** Visualização dinâmica dos slots livres, ocupados ou bloqueados para a data selecionada.
* **Carrinho de Reservas & Checkout Transparente:** Agrupamento de horários contíguos ou múltiplos, cálculo automático de sinal mínimo para garantia de reserva.
* **Simulação de Pagamento Pix:** Geração instantânea de QR Code dinâmico e código "Copia-e-Cola", com simulação de aprovação em tempo real.
* **Autenticação Descomplicada:** Cadastro instantâneo atrelado ao número de WhatsApp com validação rápida e criação de conta sem atritos.
* **Área "Minha Conta":** Histórico detalhado de reservas, comprovantes, gestão de vouchers conquistados e atualização de dados cadastrais.

### 3. Mural de Vagas Abertas (Partidas & Jogadores)
* **Socialização & Completamento de Times:** O responsável por uma reserva pode abrir vagas para que outros atletas completem a partida.
* **Mural de Oportunidades:** Jogadores avulsos podem consultar partidas que precisam de parceiros e manifestar interesse em 1 clique.
* **Gestão do Organizador:** Painel para o criador da partida aprovar interessados e acioná-los diretamente pelo WhatsApp.

### 4. Programa de Fidelidade Campeão
* **Cartela de Selos Automática:** Contabilização de selos por hora de jogo concluída, com prazos de expiração dinâmicos.
* **Cálculo de Ticket Médio Ponderado:** Algoritmo que calcula o benefício baseado no valor efetivamente pago pelo usuário nas últimas horas acumuladas.
* **Emissão e Resgate de Vouchers:** Liberação automática de cupons de desconto e créditos para reservas gratuitas diretamente no carrinho.

### 5. Contratos Recorrentes & Mensalistas
* **Gestão de Escolinhas e Grupos Fixos:** Cadastro de mensalistas com reserva automática de múltiplos dias e horários semanais.
* **Materialização de Ocorrências:** Projeção contínua da agenda para até 6 meses no futuro.
* **Política de Aviso Prévio:** Liberação assistida de horários com cancelamento programado e auditoria.

### 6. Painel Administrativo Enterprise (`/admin`)
* **Dashboard Executivo:** Indicadores-chave de desempenho (KPIs), faturamento realizado vs. previsto, taxa de ocupação das quadras e volume de atendimentos.
* **Agenda Interativa:** Alternância entre visão de Grade Diária por quadra e Calendário Mensal completo.
* **Reserva Manual de Balcão:** Interface para atendentes lançarem reservas telefônicas ou presenciais com cálculo de sinal e dados do cliente.
* **Bloqueio Estrutural de Horários:** Interdição de slots para eventos, reformas ou manutenção preventiva.
* **Gestão Financeira:** Detalhamento de receitas por período, modalidade de pagamento (Pix, Dinheiro, Cartão), status de quitação e exportação de dados.
* **Gestão de Usuários & Bloqueio:** Listagem de clientes com histórico de no-shows, permitindo bloqueio preventivo motivado com registro de auditoria.
* **Gestão de Conteúdo Institucional:** Painel para upload e ativação de fotos da estrutura e cadastro das escolinhas parceiras, integrado ao Supabase Storage.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Framework Web** | [Next.js 16 (App Router)](https://nextjs.org/) | Renderização híbrida (SSR/CSR) e rotas modernas |
| **Linguagem** | [TypeScript 5](https://www.typescriptlang.org/) | Tipagem estrita de ponta a ponta |
| **Estilização** | [Tailwind CSS 4](https://tailwindcss.com/) | Design system utilitário de alta performance |
| **Componentes UI** | [shadcn/ui](https://ui.shadcn.com/) + Radix UI | Componentes acessíveis, responsivos e customizados |
| **Ícones** | [Lucide React](https://lucide.dev/) | Iconografia consistente e moderna |
| **Rolagem Suave** | [Lenis](https://lenis.darkroom.engineering/) | Rolagem inercial suave para a Landing Page |
| **Estado Global** | [Zustand](https://zustand-demo.pmnd.rs/) | Gestão de estado performática com persistência |
| **Backend & Banco de Dados** | [Supabase](https://supabase.com/) (PostgreSQL) | Persistência na nuvem, RLS, Storage e Realtime |
| **Testes Automatizados** | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) | 339 testes unitários e de componentes |
| **Notificações** | [Sonner](https://sonner.emilkowal.ski/) | Toasts intuitivos de feedback ao usuário |

---

## 🏗️ Arquitetura do Repositório

O projeto segue padrões de separação de responsabilidades corporativa (*Clean Architecture* e *Enterprise Layering*):

```text
reservei/
├── SPEC/                  # Especificações técnicas datadas (SDD)
├── prompts/
│   └── sessoes/           # Exportações brutas dos diálogos com agentes de IA
├── tests/                 # Suíte completa de testes automatizados (32 arquivos)
│   ├── components/        # Testes de componentes (Admin, Landing, Portal, Vagas)
│   ├── hooks/             # Testes de hooks customizados de navegação e domínio
│   ├── lib/               # Testes de serviços, regras de negócio e cálculos
│   └── store/             # Testes de gerenciamento de estado Zustand
└── src/                   # Código-fonte da aplicação Next.js
    ├── app/               # Rotas e páginas (App Router: /, /admin, /login, /minha-conta)
    ├── components/        # Componentes organizados por domínio (admin, portal, landing, etc.)
    ├── hooks/             # Custom hooks encapsulando lógica de negócio
    ├── lib/               # Regras de negócio, serviços, mappers e clientes
    │   ├── adminAgenda/   # Lógica e serviços da agenda administrativa
    │   ├── fidelidade/    # Cálculos de ticket médio, selos e regras de vouchers
    │   ├── institucional/ # Repositórios e helpers de conteúdo institucional
    │   ├── landingPage/   # Configurações de seções e navegação
    │   ├── recorrencia/   # Algoritmos de contratos contínuos e ocorrências
    │   ├── supabase/      # Clients Supabase, repositórios de dados e schema.sql
    │   └── vagas/         # Regras de negócio de vagas compartilhadas
    └── store/             # Stores Zustand (autenticação, reservas, contratos)
```

---

## 🤖 Ferramentas e Modelos de IA Utilizados

Conforme exigido pelo processo da disciplina:
* **Ambientes de Desenvolvimento:** Google Antigravity IDE & Claude Code
* **Modelos Utilizados:** Gemini 3.1 Pro, Gemini 3.8 Flash, Claude 3.5 Sonnet, Claude 3.7 Sonnet e GPT-4o
* **Registros de Sessão:** Arquivos brutos armazenados e versionados na pasta [`prompts/sessoes/`](./prompts/sessoes/).

---

## 🧪 Qualidade de Software e Testes

A aplicação conta com **339 testes automatizados** (distribuídos em 32 arquivos) cobrindo fluxos críticos de negócio:
* Prevenção de conflito de horários (*double booking*).
* Projeção e materialização de contratos recorrentes de escolinhas e grupos.
* Cálculo de cancelamento com aviso prévio e regras de liberação de slots.
* Ticket médio ponderado e regras de expiração de selos da campanha de fidelidade.
* Interesses em vagas abertas e controle de capacidade máxima.
* Renderização de componentes, modais, acessibilidade e interações de interface.

Para executar a suíte de testes:
```bash
npm test
```

---

## 💻 Como Rodar o Projeto Localmente

### Pré-requisitos
* Node.js 18+ instalado
* NPM ou Yarn

### 1. Clonar o Repositório
```bash
git clone https://github.com/LeoGRibeiro/dsai-ap1-reservei.git
cd dsai-ap1-reservei
```

### 2. Configurar as Variáveis de Ambiente
Crie um arquivo `.env.local` na pasta `src/`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://sua-url-supabase.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-key
```

### 3. Instalar Dependências e Executar
```bash
# Na raiz do projeto:
npm install
npm run dev
```

A aplicação estará disponível em [http://localhost:3000](http://localhost:3000).  
O painel administrativo pode ser acessado em [http://localhost:3000/admin](http://localhost:3000/admin).

---

## 📊 Contagem Oficial de Linhas de Código (`cloc`)

Contagem realizada através do `cloc` com os filtros oficiais exigidos pela avaliação da AP1:

```bash
cloc . --vcs=git \
  --exclude-dir=node_modules,vendor,dist,build,prompts \
  --exclude-lang=Markdown,JSON,YAML,CSV,Text,SVG \
  --not-match-f='(lock|\.min\.)'
```

### 1. Código de Produção (`src/` + scripts)
```text
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
TypeScript                     116           2303           2382          21473
SQL                              1             66             50            340
JavaScript                       4             21             12            176
CSS                              1             13              4             87
-------------------------------------------------------------------------------
SUM:                           122           2403           2448          22076
-------------------------------------------------------------------------------
```

### 2. Testes Automatizados (`tests/`)
```text
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
TypeScript                      32            642             87           4310
-------------------------------------------------------------------------------
SUM:                            32            642             87           4310
-------------------------------------------------------------------------------
```

### 3. Consolidado Geral do Repositório
```text
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
TypeScript                     148           2945           2469          25783
SQL                              1             66             50            340
JavaScript                       4             21             12            176
CSS                              1             13              4             87
-------------------------------------------------------------------------------
SUM:                           154           3045           2535          26386
-------------------------------------------------------------------------------
```

| Métrica | Quantidade |
| :--- | :--- |
| **Linhas de Código Útil (code)** | **26.386** |
| **Linhas de Comentários e JSDoc** | **2.535** |
| **Linhas em Branco (formatação)** | **3.045** |
| **Total de Linhas Versionadas** | **31.966** |
| **Total de Arquivos Analisados** | **154** |



