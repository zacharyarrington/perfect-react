import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  optimizeDeps: {
    include: ['mapbox-gl', '@mapbox/mapbox-gl-draw', '@turf/turf'],
    exclude: ['shpjs'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('mapbox-gl')) return 'mapbox'
          if (id.includes('@turf')) return 'turf'
          if (id.includes('recharts') || id.includes('d3-')) return 'charts'
          if (id.includes('xlsx')) return 'xlsx'
        },
      },
    },
  },
})
