import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    setupFiles: ['src/test/bots.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
  },
});
