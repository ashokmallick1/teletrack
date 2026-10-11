import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function apkMimePlugin(): Plugin {
  return {
    name: 'apk-mime-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url === '/callyzer.apk' || req.url.startsWith('/callyzer.apk?'))) {
          const apkFile = path.resolve(__dirname, 'public/callyzer.apk');
          if (fs.existsSync(apkFile)) {
            const stat = fs.statSync(apkFile);
            res.writeHead(200, {
              'Content-Type': 'application/vnd.android.package-archive',
              'Content-Disposition': 'attachment; filename="callyzer.apk"',
              'Content-Length': stat.size
            });
            fs.createReadStream(apkFile).pipe(res);
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), apkMimePlugin()],
  server: {
    host: true,
    port: 3100,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4100',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: true,
    port: 3100,
    allowedHosts: true
  }
});
