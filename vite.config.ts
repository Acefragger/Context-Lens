import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' tells Vite to load ALL variables, not just those starting with VITE_
  // Fix: Cast process to any to avoid TypeScript error 'Property cwd does not exist on type Process'
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // This is crucial for mobile deployment. 
    // It ensures assets are loaded relatively (e.g. "./script.js") 
    // instead of absolutely (e.g. "/script.js")
    base: './', 
    define: {
      // This "bakes" the API key into the code at build time so the browser can see it
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    build: {
      outDir: 'dist',
    },
  };
});