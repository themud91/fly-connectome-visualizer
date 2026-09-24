import { defineConfig } from "vite";

// base relatif : necessaire pour que le build fonctionne sous un sous-chemin
// (GitHub Pages sert le site depuis usuario.github.io/fly-projet/, pas la racine)
export default defineConfig({
  base: "./",
});
