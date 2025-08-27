import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@sc-orgs/shared': path.resolve(__dirname, '../shared/src'),
      },
    },
    server: {
      port: parseInt(env.PORT || '3000'),
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@headlessui/react'],
            state: ['@reduxjs/toolkit', 'react-redux'],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
    // Expose environment variables to the client
    define: {
      'process.env.VITE_DISCORD_CLIENT_ID': JSON.stringify(
        env.VITE_DISCORD_CLIENT_ID
      ),
      'process.env.VITE_DISCORD_REDIRECT_URI': JSON.stringify(
        env.VITE_DISCORD_REDIRECT_URI
      ),
      'import.meta.env.VITE_DISCORD_CLIENT_ID': JSON.stringify(
        env.VITE_DISCORD_CLIENT_ID
      ),
      'import.meta.env.VITE_DISCORD_REDIRECT_URI': JSON.stringify(
        env.VITE_DISCORD_REDIRECT_URI
      ),
    },
  };
});
