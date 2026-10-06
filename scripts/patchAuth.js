const fs = require('fs');
const path = require('path');
const p = path.resolve('src/lib/supabase/authService.ts');
let content = fs.readFileSync(p, 'utf-8');

// 1. Update StoredUserRow
content = content.replace(
  'criado_em?: string;',
  'criado_em?: string;\n  bloqueado?: boolean;\n  motivo_bloqueio?: string | null;'
);

// 2. Update all places creating UserProfile from Supabase 'data' or local 'encontrado' / 'u' / 'row'
content = content.replace(/criadoEm: ([a-zA-Z0-9_\.]+)\.criado_em,/g, 'criadoEm: $1.criado_em,\n          bloqueado: $1.bloqueado,\n          motivo_bloqueio: $1.motivo_bloqueio,');

// 3. Update localStorage saving for 'atualizarPerfilSupabase'
content = content.replace(/\.\.\.\(dados\.dataNascimento !== undefined \? \{ dataNascimento: dados\.dataNascimento \} : \{\}\),/g, '...(dados.dataNascimento !== undefined ? { dataNascimento: dados.dataNascimento } : {}),\n            ...(dados.bloqueado !== undefined ? { bloqueado: dados.bloqueado } : {}),\n            ...(dados.motivo_bloqueio !== undefined ? { motivo_bloqueio: dados.motivo_bloqueio } : {}),');

content = content.replace(/\.\.\.\(dados\.dataNascimento !== undefined \? \{ data_nascimento: dados\.dataNascimento \} : \{\}\),/g, '...(dados.dataNascimento !== undefined ? { data_nascimento: dados.dataNascimento } : {}),\n          ...(dados.bloqueado !== undefined ? { bloqueado: dados.bloqueado } : {}),\n          ...(dados.motivo_bloqueio !== undefined ? { motivo_bloqueio: dados.motivo_bloqueio } : {}),');

// Add toggleBloqueioUsuario function at the end
content += `\n\n/**\n * Bloqueia ou desbloqueia um usuário\n */\nexport async function toggleBloqueioUsuario(\n  userId: string,\n  bloqueado: boolean,\n  motivo?: string\n): Promise<boolean> {\n  try {\n    await atualizarPerfilSupabase(userId, {\n      bloqueado,\n      motivo_bloqueio: motivo || null,\n    });\n    return true;\n  } catch (err) {\n    console.error("Erro ao alterar bloqueio:", err);\n    return false;\n  }\n}\n`;

fs.writeFileSync(p, content);
console.log('Done');
