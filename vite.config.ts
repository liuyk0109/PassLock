import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron({
      entry: 'electron/main.ts',
      onstart(options) {
        options.startup()
      },
      vite: {
        build: {
          outDir: 'dist-electron',
          rollupOptions: {
            input: {
              main: 'electron/main.ts',
              preload: 'electron/preload.ts',
            },
          },
        },
      },
    }),
  ],
})
