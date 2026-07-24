import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDirectory, '');
  const adminApiKey = env.ADMIN_API_KEY;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(rootDirectory, 'src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET ?? 'http://localhost:8080',
          changeOrigin: true,
          headers: adminApiKey ? { 'X-Admin-Key': adminApiKey } : undefined,
        },
      },
    },
  };
});
