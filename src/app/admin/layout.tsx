import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reservei · Admin",
  description: "Painel administrativo do Complexo Esportivo.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
