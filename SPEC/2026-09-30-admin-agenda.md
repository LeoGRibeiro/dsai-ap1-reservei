# Dashboard Admin - Agenda de Ocupação (Timeline)

## 1. O quê e por quê

Substituição da visualização de reservas em lista por uma interface de Timeline (estilo Gráfico de Gantt) e monitoramento ao vivo.

O objetivo é dar ao gestor controle espacial e temporal imediato do complexo, permitindo visualizar buracos na agenda, gerenciar o tempo das partidas ativas e prever o esforço logístico da equipe.

## 2. Critérios de aceitação

- **Visão de Timeline (Grade):** A tela deve exibir os horários do dia no eixo horizontal e as quadras no eixo vertical (ou vice-versa), mostrando as reservas como blocos visuais posicionados na grade de tempo real.
- **Cronômetro de Fim de Jogo:** Para as reservas que estão acontecendo no momento atual (considerando a hora real do sistema), o bloco visual deve exibir uma barra de progresso ou um cronômetro regressivo mostrando quanto tempo falta para o jogo acabar.
- **Alertas de Transição (Setup):** O sistema deve analisar reservas consecutivas na mesma quadra. Se houver mudança de esporte (ex: Futsal das 19h-20h e Vôlei das 20h-21h), deve aparecer um aviso visual claro de "Montagem Necessária" entre os blocos, indicando que a equipe precisará trocar o equipamento (redes/traves).
- **Interatividade Base:** Clicar em qualquer bloco de reserva na timeline abrirá os detalhes daquela reserva (a implementação estrutural do modal de detalhes será feita na próxima spec, mas o evento de clique já deve estar mapeado).
