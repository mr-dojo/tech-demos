import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Pages sets VITE_BASE_PATH, for example /tech-demos/hallmark-voltline-makeover/.
// Unset, `bun run dev` and a normal production build stay at /.
const base = process.env.VITE_BASE_PATH || "/"

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
