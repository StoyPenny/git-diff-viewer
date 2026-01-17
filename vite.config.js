import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Load custom configuration from environment
const customHost = process.env.VITE_CUSTOM_HOST
const customHosts = process.env.VITE_ALLOWED_HOSTS?.split(',').map(h => h.trim()).filter(Boolean) || []

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',              // Allow external connections
    port: 5561,                    // Your custom port
    strictPort: true,              // Exit if port unavailable
    allowedHosts: customHosts.length > 0 ? customHosts : true, // Allow all hosts by default
    watch: {
      usePolling: true,            // Required for Docker file watching
    },
    hmr: {
      host: customHost || 'localhost', // Use custom host for HMR
    },
  },
})
