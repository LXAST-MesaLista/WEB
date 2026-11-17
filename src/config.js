// MesaLista · web: configuración de la instalación (config/config.json).
//
// Se puede indicar otro archivo con la variable MESALISTA_WEB_CONFIG.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const RAIZ = join(import.meta.dirname, '..');

const archivo = process.env.MESALISTA_WEB_CONFIG ?? join(RAIZ, 'config', 'config.json');

let datos;
try {
  datos = JSON.parse(readFileSync(archivo, 'utf8'));
} catch (err) {
  console.error(`MesaLista web: no se puede leer ${archivo} (copia config/config.example.json como config.json): ${err.message}`);
  process.exit(1);
}

/** Valor de configuración con notación de puntos: config('listen.port', 8092). */
export function config(clave, porDefecto = null) {
  let valor = datos;
  for (const parte of clave.split('.')) {
    if (valor === null || typeof valor !== 'object' || !Object.hasOwn(valor, parte)) {
      return porDefecto;
    }
    valor = valor[parte];
  }
  return valor;
}

export const PRODUCCION = process.env.NODE_ENV === 'production';
