import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: "index.html",
        login: "login.html",
        adminLogin: "admin-login.html",
        student: "student.html",
        admin: "admin.html"
      }
    },
    outDir: "dist",
    emptyOutDir: true
  }
});
