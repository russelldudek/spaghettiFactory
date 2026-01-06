import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/spaghettiFactory/",
  build: {
    outDir: "docs",
  },
  plugins: [react()],
});
