// MesaLista · web: utilidades de HTML y direcciones.

import { statSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../config.js';

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };

/** Escapa un texto para ponerlo en el HTML (contra XSS). */
export function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

/** Dirección dentro de la web, con su cadena de consulta (sin los valores vacíos). */
export function url(ruta, query = {}) {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(query)) {
    if (valor !== null && valor !== undefined && valor !== '') {
      params.append(clave, String(valor));
    }
  }
  const qs = params.toString();
  return qs ? `${ruta}?${qs}` : ruta;
}

/**
 * «next» seguro para volver después de entrar: solo rutas de esta web
 * (nada de «//otra-web.com» ni «https://…»), así no sirve para redirigir fuera.
 */
export function siguiente(next, porDefecto = '/') {
  if (typeof next === 'string' && /^\/(?![/\\])\S*$/.test(next)) {
    return next;
  }
  return porDefecto;
}

const versiones = new Map();

/**
 * Dirección de un CSS o JS propio con su versión (?v=fecha del archivo): el
 * navegador los guarda una hora, y así una versión nueva se usa en cuanto se instala.
 */
export function recurso(ruta) {
  if (!versiones.has(ruta)) {
    let v = null;
    try {
      v = Math.floor(statSync(join(RAIZ, 'publico', ruta)).mtimeMs / 1000);
    } catch {
      // no existe: sin versión
    }
    versiones.set(ruta, v);
  }
  const v = versiones.get(ruta);
  return v ? `${ruta}?v=${v}` : ruta;
}

/** Primera letra en mayúscula: «sábado 7…» → «Sábado 7…». */
export function mayuscula(texto) {
  const s = String(texto ?? '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Recorta un texto a n caracteres (no bytes). */
export function recortar(texto, n) {
  return [...String(texto ?? '')].slice(0, n).join('');
}

/** Longitud en caracteres (no bytes). */
export function largo(texto) {
  return [...String(texto ?? '')].length;
}
