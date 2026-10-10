import { configDefaults, defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [preact(), viteSingleFile()],
  build: { outDir: 'dist' },
  // tests/e2e 는 Playwright 전용
  test: { exclude: [...configDefaults.exclude, 'tests/e2e/**'] },
});
