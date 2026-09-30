/**
 * Tela de login do painel administrativo.
 * Verifica a senha mockada e grava flag no LocalStorage.
 */

"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, Shield } from "lucide-react";

interface Props {
  onLogin: (senha: string) => boolean;
}

export function AdminLogin({ onLogin }: Props) {
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(false);

    // Pequeno delay para dar sensação de verificação
    await new Promise((r) => setTimeout(r, 600));

    const ok = onLogin(senha);
    setCarregando(false);

    if (!ok) {
      setErro(true);
      setSenha("");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background grid decorativo */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Glow central */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div
        className={`relative w-full max-w-sm transition-all duration-300 ${shake ? "animate-shake" : ""}`}
      >
        {/* Card */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-8 pt-10 pb-8 text-center border-b border-slate-700/40">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
              <Shield className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Área Admin</h1>
            <p className="text-slate-400 text-sm">
              Complexo Esportivo · Gestão Interna
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Senha de acesso
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  id="admin-senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    if (erro) setErro(false);
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full bg-slate-800 border rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all
                    ${
                      erro
                        ? "border-red-500/70 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {mostrarSenha ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {erro && (
                <p className="text-red-400 text-xs flex items-center gap-1.5 animate-fade-in">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                  Senha incorreta. Tente novamente.
                </p>
              )}
            </div>

            <button
              id="admin-login-btn"
              type="submit"
              disabled={carregando || !senha}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-xl py-3 text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {carregando ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  Verificando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Reservei · Painel Administrativo
        </p>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
        .animate-shake {
          animation: shake 0.45s ease-in-out;
        }
      `}</style>
    </div>
  );
}
