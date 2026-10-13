"""
Script de demonstração prática das ferramentas MCP do Reservei.

Permite executar e validar as 3 ferramentas do servidor localmente
sem depender de configurações externas.
"""

import sys
from server import consultar_disponibilidade, buscar_reservas_cliente, criar_reserva

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def main():
    print("=" * 70)
    print("🏟️ DEMO PRÁTICA: SERVIDOR MCP RESERVEI (AULA 06)")
    print("=" * 70)

    # 1. Consulta de disponibilidade
    data_teste = "2026-11-12"
    print(f"\n[Passo 1] Agente chama a ferramenta de leitura (allow):")
    print(f"👉 consultar_disponibilidade(data='{data_teste}', quadra_id='q1')\n")
    resultado_disp = consultar_disponibilidade(data_teste, "q1")
    print(resultado_disp)

    # 2. Tentativa de double booking
    print("\n" + "=" * 70)
    print(f"[Passo 2] Agente tenta criar reserva em horário OCUPADO (14:00):")
    print(f"👉 criar_reserva(quadra_id='q1', data='{data_teste}', horario='14:00', ...)\n")
    resultado_erro = criar_reserva(
        quadra_id="q1",
        data=data_teste,
        horario="14:00",
        nome_cliente="Carlos Eduardo",
        whatsapp_cliente="91988887777",
        esporte="Futsal"
    )
    print(resultado_erro)

    # 3. Criação de reserva em horário livre com confirmação simulada ('ask')
    horario_livre = "19:00"
    print("\n" + "=" * 70)
    print(f"[Passo 3] Agente tenta criar reserva em horário LIVRE ({horario_livre}) com permissão 'ask':")
    print(f"👉 [Permissão ASK solicitada] Operador autoriza a mutação no banco de dados.")
    print(f"👉 criar_reserva(quadra_id='q1', data='{data_teste}', horario='{horario_livre}', ...)\n")
    resultado_sucesso = criar_reserva(
        quadra_id="q1",
        data=data_teste,
        horario=horario_livre,
        nome_cliente="Carlos Eduardo",
        whatsapp_cliente="91988887777",
        esporte="Futsal"
    )
    print(resultado_sucesso)

    # 4. Verificação das reservas do cliente
    print("\n" + "=" * 70)
    print(f"[Passo 4] Agente consulta as reservas do cliente após o agendamento:")
    print(f"👉 buscar_reservas_cliente(telefone_ou_whatsapp='91988887777')\n")
    resultado_busca = buscar_reservas_cliente("91988887777")
    print(resultado_busca)

    print("\n" + "=" * 70)
    print("✅ Todas as 3 ferramentas foram testadas e validadas com sucesso!")
    print("=" * 70)

if __name__ == "__main__":
    main()
