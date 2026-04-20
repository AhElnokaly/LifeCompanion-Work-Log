import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.svg'],
        manifest: {
          name: 'Life Companion',
          short_name: 'LifeCompanion',
          description: 'مساعدك الذكي لإدارة العمل والمشاريع والاحتراق الوظيفي',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'logo.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ],
          shortcuts: [
            { name: 'تسجيل حضور سريع', url: '/?action=checkin', icons: [{src: 'logo.svg', sizes: 'any'}] },
            { name: 'لوحة التحكم', url: '/dashboard', icons: [{src: 'logo.svg', sizes: 'any'}] },
            { name: 'الإعدادات', url: '/settings', icons: [{src: 'logo.svg', sizes: 'any'}] }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
