# Reservas Recorrentes e Grupos Comuns (2026-10-05)

## O quê e por quê
Permitir o bloqueio recorrente de horários na agenda para dois tipos de clientes frequentes: "Escolinhas" e "Grupos Comuns" (Mensalistas). O objetivo é garantir horários cativos, oferecendo divulgação para as escolinhas e aplicando regras justas de retenção/cancelamento para os grupos comuns.

## Critérios de aceitação

### Para "Escolinhas"
- O sistema permite o cadastro de uma Escolinha e o bloqueio automático de horários por X meses.
- Na agenda do portal (visão do usuário), o horário ocupado pela escolinha deve exibir um banner promocional em destaque.
- O banner deve conter o nome, esporte e contato da escolinha, e ao ser clicado, deve redirecionar o usuário para entrar em contato com ela (ex: WhatsApp).

### Para "Grupos Comuns" (Mensalistas)
- O sistema permite o bloqueio automático de horários por X meses para o grupo, sem cobrança adiantada.
- Na agenda do portal (visão do usuário), o horário do Grupo Comum aparece simplesmente como "Ocupado" (indisponível para reserva).
- **Regra de Cancelamento e Exceção:**
  - Se o grupo avisar o cancelamento de uma data específica com **1 semana ou mais de antecedência**, a reserva daquele dia é cancelada sem ônus, e o horário é liberado para o público.
  - Se o grupo avisar com **menos de 1 semana de antecedência**, o horário é liberado para o público, porém o status financeiro do grupo fica pendente:
    - Se um usuário comum conseguir reservar e pagar por aquele horário solto, o Grupo Comum **recebe desconto (não paga a multa)** daquele dia.
    - Se o horário não for preenchido, o Grupo Comum **é cobrado** pelo dia cancelado.
### Para a Visão Administrativa (Painel Admin)
- O sistema deve possuir duas telas e fluxos distintos no painel de administração:
  - **Gestão de Escolinhas:** Interface dedicada para cadastrar os dados da escolinha (nome, esporte, contato público), definir a duração do contrato e gerenciar os bloqueios/datas na agenda.
  - **Gestão de Grupos Comuns (Mensalistas):** Interface dedicada para cadastrar o responsável pelo grupo, definir os horários cativos recorrentes e gerenciar os avisos de cancelamento (com registro da antecedência do aviso para cálculo da regra de cobrança de multas).

## Fora do escopo
- Gestão financeira e contratos robustos de pagamentos adiantados para as Escolinhas (Isso será tratado em implementações futuras).
