import type { Metadata } from "next";
import { PortalCliente } from "@/components/portal/PortalCliente";

export const metadata: Metadata = {
  title: "Reservei · Agendamento de Quadras",
  description:
    "Agende sua quadra esportiva online de forma rápida e segura. Futsal, Vôlei, Basquete, Handebol e mais.",
};

export default function Home() {
  return <PortalCliente />;
}
