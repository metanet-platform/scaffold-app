import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  // Load env file from project root (two levels up)
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), 'VITE_');
  
  // Also load non-VITE prefixed vars for process.env
  const allEnv = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  
  return {
    plugins: [
      react(),
      nodePolyfills({
        include: ['buffer', 'process', 'stream', 'util', 'crypto'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
    ],
    define: {
      'process.env': JSON.stringify(allEnv),
      global: 'globalThis',
    },
    envDir: path.resolve(__dirname, '../..'),
    envPrefix: 'VITE_',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        stream: 'stream-browserify',
        crypto: 'crypto-browserify',
      },
    },
    server: {
      port: 5500,
      host: true,
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
  };
});
