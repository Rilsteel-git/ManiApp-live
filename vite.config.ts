import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Port diambil dari env PORT bila ada supaya bisa dijalankan berdampingan
// dengan dev server lain; jatuh ke 5173 saat dijalankan manual.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: Number(process.env.PORT) || 5173 }
});
