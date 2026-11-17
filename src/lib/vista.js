// MesaLista · web: páginas HTML.
//
// Cada página tiene dos partes:
//   src/paginas/…  lo que hace (lee el formulario, llama a la API, decide)
//   vistas/…       cómo se ve (HTML con Bootstrap, plantillas EJS)
// El diseño común (cabecera, menú, pie) está en vistas/base.ejs.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ejs from 'ejs';
import { RAIZ, PRODUCCION } from '../config.js';
import { Fin } from './peticion.js';
import { esc, url, recurso, mayuscula, largo } from './html.js';
import { Formato } from './formato.js';
import { Csrf } from './csrf.js';

const CARPETA = join(RAIZ, 'vistas');
const compiladas = new Map();

function plantilla(nombre) {
  let fn = compiladas.get(nombre);
  if (!fn) {
    const archivo = join(CARPETA, `${nombre}.ejs`);
    fn = ejs.compile(readFileSync(archivo, 'utf8'), { filename: archivo, rmWhitespace: false });
    if (PRODUCCION) {
      compiladas.set(nombre, fn);
    }
  }
  return fn;
}

// Utilidades que ven todas las plantillas (además de sus propias variables).
// app.js añade Panel y Admin con registrarAyudas() (así no hay importaciones en círculo).
const ayudas = { Formato, Csrf, url, recurso, mayuscula, largo, esc };

export function registrarAyudas(extra) {
  Object.assign(ayudas, extra);
}

/** HTML de una plantilla, sin el diseño común (también para trozos que se repiten). */
export function fragmento(nombre, datos = {}) {
  return plantilla(nombre)({ ...ayudas, campo, fragmento, ...datos });
}

/**
 * Campo de formulario de Bootstrap con su etiqueta, ayuda y error.
 * attrs: atributos del <input> (type, required, maxlength, autocomplete…).
 */
export function campo(nombre, etiqueta, valor = '', attrs = {}, ayuda = null, errores = {}) {
  const id = `f-${nombre}`;
  const error = errores?.[nombre] ?? null;
  attrs = { type: 'text', ...attrs };
  let html = `<div class="mb-3"><label class="form-label" for="${esc(id)}">${esc(etiqueta)}</label>`;
  html += `<input class="form-control${error !== null ? ' is-invalid' : ''}" id="${esc(id)}" name="${esc(nombre)}"`;
  if (attrs.type !== 'password') {
    html += ` value="${esc(valor)}"`;
  }
  const describe = [];
  if (ayuda !== null) describe.push(`${id}-ayuda`);
  if (error !== null) describe.push(`${id}-error`);
  if (describe.length) {
    html += ` aria-describedby="${esc(describe.join(' '))}"`;
  }
  for (const [k, v] of Object.entries(attrs)) {
    if (v === true) {
      html += ` ${esc(k)}`;
    } else if (v !== false && v !== null && v !== undefined) {
      html += ` ${esc(k)}="${esc(v)}"`;
    }
  }
  html += '>';
  if (error !== null) {
    html += `<div class="invalid-feedback" id="${esc(id)}-error">${esc(error)}</div>`;
  }
  if (ayuda !== null) {
    html += `<div class="form-text" id="${esc(id)}-ayuda">${esc(ayuda)}</div>`;
  }
  return `${html}</div>`;
}

/** Nombre en pantalla de los campos de la API (el servidor los cita como «phone»…). */
const ETIQUETAS = {
  name: 'Nombre', email: 'Correo electrónico', phone: 'Teléfono',
  password: 'Contraseña', party: 'Personas', date: 'Día', time: 'Hora',
  notes: 'Observaciones', code: 'Código', menu: 'Menú', allergies: 'Alergias',
};

export const Vista = {
  /**
   * Muestra una plantilla dentro del diseño común y termina.
   * opc: titulo, zona ('cliente' o 'panel'), ancho ('estrecho', 'normal' o 'ancho'),
   * activa (opción del menú), scripts (otros archivos JS de la página) y
   * recargar (panel: la página se recarga sola cuando cambian los datos, RF-34).
   */
  mostrar(nombre, datos = {}, opc = {}, status = 200) {
    throw new Fin('pagina', { nombre, datos, opc, status });
  },

  /** Redirige con 303 (después de un POST, el navegador pide la página siguiente con GET). */
  redirigir(destino) {
    throw new Fin('redirigir', { destino });
  },

  error(status, titulo, texto) {
    throw new Fin('error', { status, titulo, texto });
  },

  noEncontrada() {
    Vista.error(404, 'Página no encontrada', 'La dirección no existe o ya no está disponible.');
  },

  /** Respuesta JSON para las llamadas de JavaScript de la propia web. */
  json(status, datos) {
    throw new Fin('json', { status, datos });
  },

  /** Un archivo para descargar (p. ej. el CSV de la agenda). */
  archivo(tipoArchivo, nombreArchivo, cuerpo) {
    throw new Fin('archivo', { tipoArchivo, nombreArchivo, cuerpo });
  },

  /**
   * Errores de una respuesta de la API para el formulario: si el servidor
   * dice qué campo falla, el mensaje va debajo de ese campo; si no, arriba.
   * campos traduce los nombres de la API a los del formulario y
   * etiquetas, a su nombre en pantalla (además de los habituales).
   */
  errores(r, campos = {}, etiquetas = {}) {
    const nombre = r.field();
    let mensaje = r.message();
    if (nombre === null) {
      return { _: mensaje };
    }
    const etiqueta = etiquetas[nombre] ?? ETIQUETAS[nombre] ?? null;
    if (etiqueta !== null) {
      mensaje = mensaje.replaceAll(`«${nombre}»`, `«${etiqueta}»`);
    }
    return { [campos[nombre] ?? nombre]: mensaje };
  },
};
