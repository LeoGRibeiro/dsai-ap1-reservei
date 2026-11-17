import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: ['..'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./setupTests.ts'],
    // Testes de tela com jsdom ficam mais lentos com a instrumentação de cobertura
    // e no runner do CI; 5s (padrão) gerava falhas por tempo, não por defeito.
    testTimeout: 15000,
    alias: {
      '@': path.resolve(__dirname, './'),
      'react': path.resolve(__dirname, './node_modules/react'),
      '@testing-library/react': path.resolve(__dirname, './node_modules/@testing-library/react'),
    },
    include: ['../tests/**/*.{test,spec}.{ts,tsx}'],
    // Spec: SPEC/2026-11-17-fundacao-qualidade.md
    // Cobertura de linhas do código da aplicação. O relatório lcov alimenta a
    // checagem de diff coverage no CI (meta da disciplina: 70% no código novo).
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'store/**/*.{ts,tsx}'],
      exclude: ['components/ui/**', '**/*.d.ts'],
    },
  },
});
