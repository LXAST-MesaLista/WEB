// MesaLista · web: sesiones.
//
// La sesión guarda, por zona («cliente» y «panel»), el token que da el
// servidor de MesaLista al entrar y los datos del usuario, además de los
// mensajes de un solo uso que se muestran en la página siguiente («Reserva
// cancelada»…) y el token CSRF. El navegador solo recibe una cookie con un
// identificador aleatorio (HttpOnly, SameSite=Lax y, con HTTPS, Secure).
//
// Cada sesión es un archivo JSON en sesiones.carpeta (permisos 600). Las
// peticiones de una misma sesión se atienden de una en una, para que una no
// pise lo que ha guardado otra (p. ej. la recarga del panel y un formulario).

import { randomBytes } from 'node:crypto';
import { mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { readFile, writeFile, rename, unlink, utimes } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { config, RAIZ } from '../config.js';
import { peticion } from './peticion.js';

const COOKIE = 'mlweb';
const CARPETA = resolve(RAIZ, config('sesiones.carpeta') || 'sesiones');
const DURACION_MS = Math.max(5, Number(config('sesiones.minutos', 120))) * 60_000;
const ID_VALIDO = /^[A-Za-z0-9_-]{43}$/;

mkdirSync(CARPETA, { recursive: true, mode: 0o700 });

const archivo = (id) => join(CARPETA, `${id}.json`);
const nuevoId = () => randomBytes(32).toString('base64url');

// --- Cola por sesión ---------------------------------------------------------
const colas = new Map();

/** Ejecuta fn cuando hayan terminado las peticiones anteriores de la misma sesión. */
export async function enCola(id, fn) {
  if (!id) {
    return fn();
  }
  const anterior = colas.get(id) ?? Promise.resolve();
  let soltar;
  const turno = new Promise((resolve) => { soltar = resolve; });
  const cadena = anterior.then(() => turno);
  colas.set(id, cadena);
  await anterior;
  try {
    return await fn();
  } finally {
    soltar();
    if (colas.get(id) === cadena) {
      colas.delete(id);
    }
  }
}

// --- Cookie ------------------------------------------------------------------

/** Identificador de sesión de la cookie, si tiene buen formato. */
export function idDeCookie(req) {
  for (const parte of (req.headers.cookie ?? '').split(';')) {
    const [nombre, ...valor] = parte.trim().split('=');
    if (nombre === COOKIE) {
      const id = valor.join('=');
      return ID_VALIDO.test(id) ? id : null;
    }
  }
  return null;
}

function cabeceraCookie(id) {
  const segura = config('https', true) === true ? '; Secure' : '';
  return `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax${segura}`;
}

// --- Carga y guardado ----------------------------------------------------------

/** Abre la sesión de la petición (vacía si no hay o ha caducado). */
export async function abrir(id) {
  const s = { id, datos: {}, original: '{}', nueva: id === null, borrar: [] };
  if (id === null) {
    return s;
  }
  try {
    const st = statSync(archivo(id));
    if (Date.now() - st.mtimeMs > DURACION_MS) {
      await unlink(archivo(id)).catch(() => {});
      s.nueva = true;
      return s;
    }
    const texto = await readFile(archivo(id), 'utf8');
    const datos = JSON.parse(texto);
    if (datos && typeof datos === 'object' && !Array.isArray(datos)) {
      s.datos = datos;
      s.original = JSON.stringify(datos);
    }
  } catch {
    s.nueva = true;   // no existe o está dañada: se empieza de nuevo
  }
  return s;
}

/**
 * Guarda la sesión al terminar la petición. Solo se escribe si ha cambiado
 * (si no, se renueva la fecha del archivo) y solo se crea si tiene datos.
 */
export async function guardar(s, res) {
  for (const viejo of s.borrar) {
    await unlink(archivo(viejo)).catch(() => {});
  }
  const json = JSON.stringify(s.datos);
  const vacia = json === '{}';
  if (s.id === null) {
    if (vacia) {
      return;
    }
    s.id = nuevoId();
    s.nueva = true;
  }
  if (s.nueva || json !== s.original) {
    if (vacia && !s.nueva) {
      await unlink(archivo(s.id)).catch(() => {});
      return;
    }
    const tmp = `${archivo(s.id)}.${process.pid}.tmp`;
    await writeFile(tmp, json, { mode: 0o600 });
    await rename(tmp, archivo(s.id));
  } else {
    const ahora = new Date();
    await utimes(archivo(s.id), ahora, ahora).catch(() => {});
  }
  if (s.nueva && !res.headersSent) {
    res.setHeader('Set-Cookie', cabeceraCookie(s.id));
  }
}

/** Nuevo identificador para la misma sesión (al entrar y al salir, contra la fijación de sesión). */
export function regenerar() {
  const s = peticion().sesion;
  if (s.id !== null) {
    s.borrar.push(s.id);
  }
  s.id = nuevoId();
  s.nueva = true;
}

/** Borra los archivos de las sesiones caducadas. */
export function limpiar() {
  let borradas = 0;
  for (const nombre of readdirSync(CARPETA)) {
    if (!nombre.endsWith('.json') && !nombre.endsWith('.tmp')) {
      continue;
    }
    try {
      const ruta = join(CARPETA, nombre);
      if (Date.now() - statSync(ruta).mtimeMs > DURACION_MS) {
        unlinkSync(ruta);
        borradas++;
      }
    } catch {
      // ya no existe
    }
  }
  return borradas;
}

// --- Datos de la sesión ----------------------------------------------------------

const datos = () => peticion().sesion.datos;

export const Sesion = {
  /** Token del servidor para la zona («cliente» o «panel»), o null. */
  token(zona) {
    return datos()[zona]?.token ?? null;
  },

  usuario(zona) {
    return datos()[zona]?.user ?? null;
  },

  /** Al entrar: nuevo identificador de sesión y token de la zona. */
  entrar(zona, session, user) {
    regenerar();
    datos()[zona] = { token: session.token, user };
  },

  actualizarUsuario(zona, user) {
    if (datos()[zona]) {
      datos()[zona].user = user;
    }
  },

  olvidar(zona) {
    delete datos()[zona];
  },

  /** Mensaje para la página siguiente. tipo: success, info, warning, danger o alerta. */
  aviso(tipo, texto) {
    (datos()._avisos ??= []).push([tipo, texto]);
  },

  /** Mensajes pendientes; se borran al leerlos. */
  avisos() {
    const avisos = datos()._avisos ?? [];
    delete datos()._avisos;
    return avisos;
  },

  /** Otros valores de la sesión (preferencias de la sala, día de la agenda…). */
  leer(clave) {
    return datos()[clave] ?? null;
  },

  poner(clave, valor) {
    datos()[clave] = valor;
  },

  quitar(clave) {
    delete datos()[clave];
  },
};
