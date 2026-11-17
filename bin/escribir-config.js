#!/usr/bin/env node
// MesaLista · crea config/config.json de la instalación a partir de
// config/config.example.json. Lo usa despliegue/instalar.sh.
//
//   node bin/escribir-config.js <destino> [puerto de la API]
//
// Si el archivo ya existe no se regenera (se conservan los cambios hechos a
// mano); solo se corrige la dirección de la API si el puerto es otro.

import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const destino = process.argv[2];
const puertoApi = Number(process.argv[3] ?? 8091);
if (!destino || !Number.isInteger(puertoApi) || puertoApi < 1 || puertoApi > 65535) {
  console.error('Uso: node bin/escribir-config.js <destino> [puerto de la API]');
  process.exit(2);
}

const api = `http://127.0.0.1:${puertoApi}/api/v1`;
const escribir = (c) => {
  const tmp = `${destino}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(c, null, 2)}\n`, { mode: 0o640 });
  renameSync(tmp, destino);
};

if (existsSync(destino)) {
  const c = JSON.parse(readFileSync(destino, 'utf8'));
  if (c.api === api) {
    console.log('config.json ya existe; no se modifica.');
    process.exit(0);
  }
  const antes = c.api;
  c.api = api;
  escribir(c);
  console.log(`config.json: API cambiada de «${antes}» a «${api}».`);
  process.exit(0);
}

const c = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'config', 'config.example.json'), 'utf8'));
c.api = api;
c.https = true;
c.sesiones = { ...c.sesiones, carpeta: '/var/lib/mesalista-web/sesiones' };
escribir(c);
console.log('config.json creado.');
