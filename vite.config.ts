import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type UserConfig } from 'vite';
import type { UserConfig as VitestUserConfig } from 'vitest/config';

export default defineConfig(({ mode }): UserConfig & { test: NonNullable<VitestUserConfig['test']> } => ({
  plugins: [
    ...(mode !== 'test' ? [tailwindcss()] : []),
    react(),
  ],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: ['tests/**'],
  },
}));
