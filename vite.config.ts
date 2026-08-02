import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Check for either API_KEY or GEMINI_API_KEY
  const apiKey = env.API_KEY || env.GEMINI_API_KEY || "";

  return {
    plugins: [react()],
    define: {
      'process.env': {}
    },
    server: {
      host: true
    }
  }
})