"use client";

import { use } from "react";
import { PaginaEvento } from "@/components/eventos/PaginaEvento";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EventoPage({ params }: Props) {
  const { id } = use(params);
  return <PaginaEvento eventoId={id} />;
}
