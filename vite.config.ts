import react from '@vitejs/plugin-react';
import { defineConfig, type UserConfig } from 'vite';
import type { UserConfig as VitestUserConfig } from 'vitest/config';

const config: UserConfig & { test: NonNullable<VitestUserConfig['test']> } = {
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: ['tests/**'],
  },
};

export default defineConfig(config);
