import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  external: [
    'react',
    'react-dom',
    '@mui/material',
    '@mui/x-data-grid',
    '@mui/x-date-pickers',
    '@emotion/react',
    '@emotion/styled',
  ],
  treeshake: true,
});
