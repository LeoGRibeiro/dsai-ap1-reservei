# Reservei 🏟️

**Dupla:** Leonardo G. Ribeiro e Lucas Reis

Plataforma web responsiva de gestão e locação de espaços esportivos — um complexo com múltiplas quadras fictícias.

## Sobre o projeto

O **Reservei** digitaliza o processo de agendamento de quadras esportivas, eliminando conflitos de horários (double booking) e centralizando a gestão financeira em um painel administrativo completo.

> Especificação arquitetural: [`SPEC/2026-09-30-visao-geral.md`](./SPEC/2026-09-30-visao-geral.md)

**Acesso ao projeto publicado:** [https://dsai-ap1-reservei-3ea2fei8c-leo-gr-ibeiro.vercel.app](https://dsai-ap1-reservei-3ea2fei8c-leo-gr-ibeiro.vercel.app)

---

## Stack

| Camada            | Tecnologia                                    |
|-------------------|-----------------------------------------------|
| Framework         | [Next.js 15](https://nextjs.org/) (App Router) |
| Linguagem         | TypeScript                                    |
| Estilização       | Tailwind CSS                                  |
| Componentes UI    | shadcn/ui                                     |
| Estado global     | Zustand                                       |
| Persistência      | LocalStorage (simulado)                       |
| Linting           | ESLint                                        |

---

## Ferramentas e Modelos de IA Utilizados

- **Ferramentas:** Google Antigravity IDE (Gemini)
- **Modelos:** Gemini 3.1 Pro, Gemini 3.8 Flash, Claude 4.6 Sonnet

---

## Estrutura do repositório

```
reservei/
├── SPEC/               # Especificações e decisões arquiteturais
├── prompts/            # Histórico de prompts utilizados
├── tests/              # Testes automatizados
└── src/                # Aplicação Next.js
    ├── app/            # App Router (páginas e layouts)
    ├── components/     # Componentes reutilizáveis
    ├── lib/            # Utilitários e helpers
    └── store/          # Estado global (Zustand)
```

---

## Visões do sistema

- **Portal do Cliente** — Vitrine de quadras e fluxo de agendamento com pagamento Pix mockado.
- **Dashboard Admin** — Gestão de ocupação, calendário de reservas e relatórios financeiros (ganhos/previstos).

---

## Como rodar localmente

Antes de rodar, crie um arquivo `.env.local` na pasta `src/` (ou copie o conteúdo abaixo):

```env
NEXT_PUBLIC_SUPABASE_URL=https://sua-url-supabase.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-key
```

Depois, instale as dependências e rode o projeto:

```bash
# Na pasta src/
cd src
npm install
npm run dev
```

Acesse em: [http://localhost:3000](http://localhost:3000)

---

## Fora do escopo

- Integração real com gateways de pagamento — o fluxo exibe um QR Code Pix falso com botões **"Simular Sucesso"** e **"Cancelar"**.
- Aplicativo mobile nativo (iOS/Android).
- Sistema algorítmico de balanceamento ou formação de times.

---

## Contagem de Linhas (cloc)

**Código Fonte (src):**
```text
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
TypeScript                      51            853            370           7999
SQL                              1             16             11            107
CSS                              1              9              3             65
JavaScript                       2              3              2             20
-------------------------------------------------------------------------------
SUM:                            55            881            386           8191
-------------------------------------------------------------------------------
```

**Testes (tests):**
```text
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
TypeScript                       2             15              1            109
-------------------------------------------------------------------------------
SUM:                             2             15              1            109
-------------------------------------------------------------------------------
```

