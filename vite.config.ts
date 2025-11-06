import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // Vite expõe variáveis de ambiente automaticamente com prefixo VITE_
      // No Cloud Run, as variáveis devem ter prefixo VITE_ para serem expostas no build
      envPrefix: ['VITE_'],
      define: {
        // Garantir que as variáveis sejam acessíveis no build
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
        'import.meta.env.VITE_POSTMARK_PROXY_URL': JSON.stringify(env.VITE_POSTMARK_PROXY_URL || ''),
        'import.meta.env.VITE_AUTH_RESET_PROXY_URL': JSON.stringify(env.VITE_AUTH_RESET_PROXY_URL || ''),
        'import.meta.env.DEV': JSON.stringify(mode === 'development'),
        'import.meta.env.PROD': JSON.stringify(mode === 'production'),
        'import.meta.env.MODE': JSON.stringify(mode),
      },
      build: {
        // Garantir que o build seja otimizado para produção
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        minify: 'esbuild',
        rollupOptions: {
          output: {
            // Garantir nomes de arquivos consistentes
            entryFileNames: 'assets/[name].[hash].js',
            chunkFileNames: 'assets/[name].[hash].js',
            assetFileNames: 'assets/[name].[hash].[ext]',
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
