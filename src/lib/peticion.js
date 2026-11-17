// MesaLista · web: la petición en curso.
//
// Cada petición se atiende dentro de su propio contexto (AsyncLocalStorage):
// las páginas y las librerías llaman a peticion() para leer el formulario,
// la sesión o la dirección sin tener que pasarlos de función en función.

import { AsyncLocalStorage } from 'node:async_hooks';

const almacen = new AsyncLocalStorage();

/** Ejecuta fn con el contexto de una petición. */
export function conPeticion(ctx, fn) {
  return almacen.run(ctx, fn);
}

/**
 * Contexto de la petición en curso: { req, res, metodo, ruta, uri, get, post,
 * cabeceras, ip, proto, sesion, cfg }.
 */
export function peticion() {
  const ctx = almacen.getStore();
  if (!ctx) {
    throw new Error('Fuera de una petición');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Fin de la respuesta. Las páginas terminan lanzando uno de estos objetos
// (mostrar una plantilla, redirigir, JSON, archivo o página de error) y el
// despachador (app.js) escribe la respuesta. Así una página puede «salir» en
// cualquier punto, también desde dentro de una librería.
// ---------------------------------------------------------------------------

export class Fin {
  constructor(tipo, datos) {
    this.tipo = tipo;
    Object.assign(this, datos);
  }
}

// ---------------------------------------------------------------------------
// Formularios y cadenas de consulta. Los nombres con corchetes forman listas
// y objetos: «menu_options[]=1&menu_options[]=3» → { menu_options: ['1', '3'] },
// «slots[0][open]=13:00» → { slots: { 0: { open: '13:00' } } }.
// ---------------------------------------------------------------------------

const PROHIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_CAMPOS = 2000;
const MAX_PROFUNDIDAD = 5;

function partesNombre(nombre) {
  const abre = nombre.indexOf('[');
  if (abre <= 0) {
    return [nombre];
  }
  const partes = [nombre.slice(0, abre)];
  const resto = nombre.slice(abre);
  const re = /\[([^\]]*)\]/gy;
  let m;
  let fin = 0;
  while ((m = re.exec(resto)) !== null) {
    partes.push(m[1]);
    fin = re.lastIndex;
  }
  if (fin !== resto.length || partes.length > MAX_PROFUNDIDAD + 1) {
    return [nombre];   // corchetes mal formados: el nombre se usa tal cual
  }
  return partes;
}

/** Interpreta «a=1&b[]=2&c[x][y]=3» como lo haría un formulario HTML. */
export function interpretarFormulario(texto) {
  const resultado = {};
  let n = 0;
  for (const [nombre, valor] of new URLSearchParams(texto)) {
    if (++n > MAX_CAMPOS) {
      break;
    }
    const partes = partesNombre(nombre);
    if (partes.some((p) => PROHIBIDAS.has(p))) {
      continue;
    }
    let nodo = resultado;
    for (let i = 0; i < partes.length; i++) {
      const ultima = i === partes.length - 1;
      let clave = partes[i];
      if (clave === '' && i > 0) {
        if (!Array.isArray(nodo)) {
          break;   // «a[x]=1&a[]=2»: se ignora el segundo
        }
        clave = nodo.length;
      }
      if (ultima) {
        nodo[clave] = valor;
      } else {
        const siguienteEsLista = partes[i + 1] === '';
        const actual = nodo[clave];
        if (actual === undefined || typeof actual !== 'object') {
          nodo[clave] = siguienteEsLista ? [] : {};
        }
        nodo = nodo[clave];
      }
    }
  }
  return resultado;
}

/** Valor de texto de un campo (o '' si falta o no es texto). */
export function texto(valor, porDefecto = '') {
  return typeof valor === 'string' ? valor : porDefecto;
}

/** Elementos de una lista u objeto del formulario («a[]» o «a[0]»). */
export function lista(valor) {
  if (Array.isArray(valor)) {
    return valor;
  }
  if (valor !== null && typeof valor === 'object') {
    return Object.values(valor);
  }
  return valor === undefined || valor === null ? [] : [valor];
}

/** Entero como (int) de un formulario: «12» → 12, «abc» → 0. */
export function entero(valor, porDefecto = 0) {
  if (typeof valor === 'number') {
    return Math.trunc(valor);
  }
  if (typeof valor !== 'string') {
    return porDefecto;
  }
  const n = Number.parseInt(valor.trim(), 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Entero estricto («12» sí, «12a» o «» no): el número, o null. */
export function enteroValido(valor) {
  if (typeof valor === 'number' && Number.isInteger(valor)) {
    return valor;
  }
  if (typeof valor === 'string' && /^\s*[+-]?\d+\s*$/.test(valor)) {
    return Number.parseInt(valor, 10);
  }
  return null;
}
