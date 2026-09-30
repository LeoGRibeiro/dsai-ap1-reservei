/**
 * AdminShell — Orquestrador da área administrativa.
 * Gerencia autenticação, roteamento interno e layout com Sidebar.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLogin } from "./AdminLogin";
import { AdminSidebar, type AdminView } from "./AdminSidebar";
import { AdminDashboardPage } from "./AdminDashboardPage";

// Placeholder pages para futuras specs
function PlaceholderPage({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-5">
        <span className="text-3xl">🚧</span>
      </div>
      <h2 className="text-xl font-bold text-white mb-2">{titulo}</h2>
      <p className="text-slate-400 text-sm max-w-xs">
        Esta seção está planejada e será implementada na próxima especificação.
      </p>
    </div>
  );
}

interface Props {
  initialView?: AdminView;
}

export function AdminShell({ initialView = "dashboard" }: Props) {
  const { autenticado, login, logout } = useAdminAuth();
  const [view, setView] = useState<AdminView>(initialView);
  const router = useRouter();

  // Redireciona para /admin/dashboard após login bem-sucedido
  useEffect(() => {
    if (autenticado && typeof window !== "undefined") {
      const pathAtual = window.location.pathname;
      if (pathAtual === "/admin") {
        router.replace("/admin/dashboard");
      }
    }
  }, [autenticado, router]);

  // ── Carregando (hidratação do LocalStorage) ──────────────────────────────
  if (autenticado === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <span className="inline-block w-6 h-6 border-2 border-slate-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Não autenticado → Tela de login ──────────────────────────────────────
  if (!autenticado) {
    return <AdminLogin onLogin={login} />;
  }

  // ── Autenticado → Layout principal ───────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-slate-950">
      <AdminSidebar
        viewAtual={view}
        onChangeView={setView}
        onLogout={logout}
      />

      {/* Conteúdo principal */}
      <main className="flex-1 min-w-0 lg:pt-0 pt-[57px]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {view === "dashboard" && <AdminDashboardPage />}
          {view === "agenda" && (
            <PlaceholderPage titulo="Agenda de Ocupação" />
          )}
          {view === "financeiro" && (
            <PlaceholderPage titulo="Financeiro" />
          )}
        </div>
      </main>
    </div>
  );
}
