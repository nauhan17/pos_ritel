import { defineConfig, splitVendorChunkPlugin } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    server: { host: '127.0.0.1', port: 5173, strictPort: true, hmr: { host: '127.0.0.1' } },
    plugins: [
        laravel({ input: ['resources/css/app.css', 'resources/js/app.js'], refresh: true }),
        tailwindcss(),
        splitVendorChunkPlugin(),
    ],
    build: {
        cssCodeSplit: true,
        rollupOptions: {
            output: {
                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: (assetInfo) =>
                    assetInfo.name && assetInfo.name.endsWith('.css')
                        ? 'assets/css/[name]-[hash][extname]'
                        : 'assets/[name]-[hash][extname]',
            },
        },
    },
    optimizeDeps: {
        include: ['bootstrap', 'sweetalert2', 'xlsx', 'jspdf', 'jspdf-autotable']
    },
    esbuild: {
        target: 'es2020'
    }
});
