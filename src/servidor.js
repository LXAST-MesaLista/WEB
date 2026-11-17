// MesaLista · servidor de la web.
//
//   node src/servidor.js
//
// Escucha en listen.host:listen.port de config/config.json (por defecto
// 127.0.0.1:8092). En el servidor real solo lo alcanza nginx, que termina
// HTTPS, sirve /assets y le reenvía el resto (despliegue/nginx-mesalista.conf).

import { createServer } from 'node:http';
import { config } from './config.js';
import { atender } from './app.js';
import { limpiar } from './lib/sesion.js';

const host = config('listen.host', '127.0.0.1');
const port = Number(process.env.PORT ?? config('listen.port', 8092));

const servidor = createServer((req, res) => {
  atender(req, res).catch((err) => {
    console.error('MesaLista web: error sin atender:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end();
  });
});
servidor.requestTimeout = 30_000;
servidor.headersTimeout = 15_000;
servidor.keepAliveTimeout = 5_000;

servidor.listen(port, host, () => {
  console.log(`MesaLista: web escuchando en http://${host}:${port}/`);
});

// Las sesiones caducadas se borran al arrancar y cada 15 minutos.
const limpiarSesiones = () => {
  try {
    const n = limpiar();
    if (n > 0) {
      console.log(`MesaLista web: ${n} sesiones caducadas borradas`);
    }
  } catch (err) {
    console.error('MesaLista web: no se han podido limpiar las sesiones:', err.message);
  }
};
limpiarSesiones();
setInterval(limpiarSesiones, 15 * 60_000).unref();

let cerrando = false;
function apagar(senal) {
  if (cerrando) {
    return;
  }
  cerrando = true;
  console.log(`MesaLista web: ${senal} recibido, cerrando…`);
  servidor.close(() => process.exit(0));
  // Si alguna conexión no se cierra, se fuerza a los 10 segundos.
  setTimeout(() => process.exit(0), 10_000).unref();
}
process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));
