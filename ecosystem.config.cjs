// Configuration PM2 — gestion de processus (redémarrage auto, logs, démarrage au boot).
// Usage :
//   pm2 start ecosystem.config.cjs
//   pm2 save && pm2 startup   (suivre l'instruction affichée pour le boot auto)
//   pm2 restart foot          (après une mise à jour)
module.exports = {
  apps: [
    {
      name: "foot",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      instances: 1, // SQLite : 1 seule instance (pas de concurrence multi-process sur le même fichier)
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "512M",
    },
  ],
};