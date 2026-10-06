const fs = require('fs');
const path = require('path');
const p = path.resolve('src/components/admin/AdminUsuariosPage.tsx');
let content = fs.readFileSync(p, 'utf-8');

// Imports
content = content.replace(
  'import { atualizarPerfilSupabase, excluirContaSupabase, listarUsuariosCadastrados } from "@/lib/supabase/authService";',
  'import { atualizarPerfilSupabase, excluirContaSupabase, listarUsuariosCadastrados, toggleBloqueioUsuario } from "@/lib/supabase/authService";'
);
content = content.replace(
  'import { Search, Users, MapPin, Calendar, Clock, DollarSign, Activity, ChevronRight, X, Edit2, ShieldAlert, Trash2, Loader2, ExternalLink, Cake, PartyPopper } from "lucide-react";',
  'import { Search, Users, MapPin, Calendar, Clock, DollarSign, Activity, ChevronRight, X, Edit2, ShieldAlert, Trash2, Loader2, ExternalLink, Cake, PartyPopper, Ban, CheckCircle } from "lucide-react";'
);

// State
content = content.replace(
  'const [usuarioExcluir, setUsuarioExcluir] = useState<UserProfile | null>(null);',
  'const [usuarioExcluir, setUsuarioExcluir] = useState<UserProfile | null>(null);\n  const [usuarioBloqueio, setUsuarioBloqueio] = useState<UserProfile | null>(null);\n  const [motivoBloqueio, setMotivoBloqueio] = useState("");\n  const [alterandoBloqueio, setAlterandoBloqueio] = useState(false);'
);

// Toggle Block Handler
const handlerCode = `
  const handleToggleBloqueio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioBloqueio) return;
    setAlterandoBloqueio(true);
    try {
      const novoStatus = !usuarioBloqueio.bloqueado;
      const success = await toggleBloqueioUsuario(usuarioBloqueio.id, novoStatus, motivoBloqueio);
      if (success) {
        toast.success(novoStatus ? "Usuário bloqueado com sucesso." : "Usuário desbloqueado com sucesso.");
        carregarDados();
        setUsuarioBloqueio(null);
        setUsuarioDetalhes(null);
      } else {
        toast.error("Falha ao alterar bloqueio.");
      }
    } finally {
      setAlterandoBloqueio(false);
    }
  };
`;
content = content.replace(
  '// Exclui conta do usuário',
  handlerCode + '\n  // Exclui conta do usuário'
);

// List indicator
content = content.replace(
  '<div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">',
  '<div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2">\n                    {u.bloqueado && <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-black tracking-wide border border-red-500/30">Bloqueado</span>}'
);
content = content.replace(
  '<div className="text-sm font-bold text-white truncate max-w-[120px] sm:max-w-full">',
  '<div className="text-sm font-bold text-white truncate max-w-[120px] sm:max-w-full flex items-center gap-2">\n                              {u.bloqueado && <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-black tracking-wide border border-red-500/30">Bloqueado</span>}'
);

// Details button
const detailsButtons = `
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setMotivoBloqueio(usuarioDetalhes.motivo_bloqueio || "");
                    setUsuarioBloqueio(usuarioDetalhes);
                  }}
                  variant="outline"
                  className={\`border-slate-700 hover:bg-slate-800 \${usuarioDetalhes.bloqueado ? 'text-emerald-400' : 'text-orange-400'} gap-1.5\`}
                >
                  {usuarioDetalhes.bloqueado ? <><CheckCircle className="w-3.5 h-3.5" /> Desbloquear</> : <><Ban className="w-3.5 h-3.5" /> Bloquear</>}
                </Button>
                <Button
`;

content = content.replace(
  /<div className="flex items-center gap-2">\s*<Button/g,
  detailsButtons
);

// Add Block Modal
const blockModal = `
      {/* 🛑 MODAL: Bloqueio de Usuário 🛑 */}
      {usuarioBloqueio && (
        <Dialog
          open={Boolean(usuarioBloqueio)}
          onOpenChange={(v) => !v && setUsuarioBloqueio(null)}
        >
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md p-6">
            <DialogHeader>
              <div className={\`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 mx-auto \${usuarioBloqueio.bloqueado ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}\`}>
                {usuarioBloqueio.bloqueado ? <CheckCircle className="w-6 h-6" /> : <Ban className="w-6 h-6" />}
              </div>
              <DialogTitle className="text-lg font-black text-center text-white">
                {usuarioBloqueio.bloqueado ? "Desbloquear Usuário?" : "Bloquear Usuário?"}
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-center text-xs mt-1">
                {usuarioBloqueio.bloqueado 
                  ? \`Tem certeza que deseja restaurar o acesso de \${usuarioBloqueio.nome}?\`
                  : \`Ao bloquear \${usuarioBloqueio.nome}, ele não poderá realizar novas reservas no Portal do Cliente.\`}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleToggleBloqueio} className="space-y-4 my-2">
              {!usuarioBloqueio.bloqueado && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">
                    Motivo do Bloqueio (Opcional - Interno)
                  </Label>
                  <textarea
                    value={motivoBloqueio}
                    onChange={(e) => setMotivoBloqueio(e.target.value)}
                    placeholder="Ex: Não compareceu a 3 reservas consecutivas..."
                    className="w-full bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-lg p-3 text-sm min-h-[80px]"
                  />
                </div>
              )}

              {usuarioBloqueio.bloqueado && usuarioBloqueio.motivo_bloqueio && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 my-2 text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Motivo atual do bloqueio:</p>
                  <p>{usuarioBloqueio.motivo_bloqueio}</p>
                </div>
              )}

              <DialogFooter className="pt-3 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUsuarioBloqueio(null)}
                  disabled={alterandoBloqueio}
                  className="border-slate-700 text-slate-300"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={alterandoBloqueio}
                  variant="destructive"
                  className={\`\${usuarioBloqueio.bloqueado ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-orange-600 hover:bg-orange-500'} text-white font-bold gap-2\`}
                >
                  {alterandoBloqueio ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                  ) : (
                    <>{usuarioBloqueio.bloqueado ? 'Sim, Desbloquear' : 'Sim, Bloquear'}</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
`;

content = content.replace(
  '{/* 🗑️ MODAL: Confirmação de Exclusão (LGPD) 🗑️ */}',
  blockModal + '\n      {/* 🗑️ MODAL: Confirmação de Exclusão (LGPD) 🗑️ */}'
);

fs.writeFileSync(p, content);
console.log('Done');
