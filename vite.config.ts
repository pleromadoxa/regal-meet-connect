import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    {
      name: 'copy-regal-mail-logo',
      closeBundle() {
        const src = path.resolve(__dirname, 'public/regal-mail-logo.png');
        const dest = path.resolve(__dirname, 'dist/regal-mail-logo.png');
        if (fs.existsSync(src) && fs.existsSync(path.dirname(dest))) {
          fs.copyFileSync(src, dest);
        }
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
