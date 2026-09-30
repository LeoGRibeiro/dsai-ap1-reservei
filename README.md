# Reservei 🏟️

Plataforma web responsiva de gestão e locação de espaços esportivos — um complexo com múltiplas quadras fictícias.

## Sobre o projeto

O **Reservei** digitaliza o processo de agendamento de quadras esportivas, eliminando conflitos de horários (double booking) e centralizando a gestão financeira em um painel administrativo completo.

> Especificação arquitetural: [`SPEC/2026-09-30-visao-geral.md`](./SPEC/2026-09-30-visao-geral.md)

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
