import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.integration.test.ts',
        'src/**/types.ts',
        'src/index.ts',
        // Browser bundle + dev-only paths; covered by manual/E2E until Playwright lands (PHASE-2.md).
        'src/client/**',
        'src/engine/watcher.ts',
        'src/engine/shell.ts',
        'src/engine/index.ts',
      ],
      thresholds: {
        lines: 70,
        branches: 66,
        functions: 66,
        statements: 70,
      },
    },
  },
});
