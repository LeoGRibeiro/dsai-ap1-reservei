import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Spec: SPEC/2026-11-17-fundacao-qualidade.md
    // O código herdado da AP1 tem 19 efeitos que chamam setState (carregar dados
    // ao montar, resetar formulários ao abrir modais). A regra aponta um custo de
    // performance, não um defeito, e reescrever esses componentes sem testes de
    // tela seria arriscado. Fica como aviso: código novo deve evitar o padrão e
    // os efeitos existentes são corrigidos quando o componente for alterado.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
