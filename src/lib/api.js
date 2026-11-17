// MesaLista · web: llamadas al servidor de MesaLista (API REST /api/v1).
//
// El navegador nunca habla con la API desde estas páginas: lo hace este
// proceso, que guarda el token de la sesión y lo envía en «Authorization:
// Bearer». Hay dos zonas con su propio token: «cliente» y «panel» (personal
// y administración). La IP del navegador va en X-Forwarded-For y el
// protocolo con el que llegó, en X-Forwarded-Proto (la API se fía de ellas
// porque la conexión sale de esta misma máquina).

import http from 'node:http';
import https from 'node:https';
import { config } from '../config.js';
import { peticion } from './peticion.js';
import { Sesion } from './sesion.js';
import { Vista } from './vista.js';
import { url, siguiente } from './html.js';

const BASE = String(config('api', 'http://127.0.0.1:8091/api/v1')).replace(/\/+$/, '');
const TIEMPO_MAX_MS = 15_000;
const agenteHttp = new http.Agent({ keepAlive: true, maxSockets: 32 });
const agenteHttps = new https.Agent({ keepAlive: true, maxSockets: 32 });

/** Respuesta del servidor de MesaLista. */
export class Respuesta {
  constructor(status, body, raw = '', headers = {}) {
    this.status = status;
    this.body = body;
    this.raw = raw;
    this.headers = headers;
  }

  ok() {
    return this.status >= 200 && this.status < 300;
  }

  /** Código del error («conflict», «deadline»…), o null si ha ido bien. */
  code() {
    return this.body?.error?.code ?? null;
  }

  /** Mensaje del error en español, para mostrarlo tal cual. */
  message() {
    return String(this.body?.error?.message ?? 'Ha habido un problema. Inténtalo de nuevo.');
  }

  /** Campo del formulario que falla, si el servidor lo indica. */
  field() {
    return this.body?.error?.field ?? null;
  }

  /** El servidor pide mostrar este error como aviso destacado (hay que cerrarlo a mano, RF-21). */
  alerta() {
    return this.body?.error?.alert === true;
  }

  /** Dato adicional del error (p. ej. early_possible en una llegada anticipada). */
  extra(clave) {
    return this.body?.error?.[clave] ?? null;
  }

  /** Los datos si ha ido bien; si no, una página de error con el mensaje del servidor. */
  datos() {
    if (this.ok()) {
      return this.body;
    }
    if (this.status === 404) {
      Vista.error(404, 'No encontrado', this.message());
    }
    Vista.error(this.status >= 400 ? this.status : 503, 'No se ha podido cargar la página', this.message());
  }
}

/** Petición HTTP a la API; nunca lanza: si no hay conexión, status 0. */
function enviar(metodo, ruta, cabeceras, cuerpo) {
  const destino = new URL(BASE + ruta);
  const cliente = destino.protocol === 'https:' ? https : http;
  return new Promise((resolve) => {
    const req = cliente.request(destino, {
      method: metodo,
      headers: cabeceras,
      agent: destino.protocol === 'https:' ? agenteHttps : agenteHttp,
      timeout: TIEMPO_MAX_MS,
    }, (res) => {
      const trozos = [];
      res.on('data', (t) => trozos.push(t));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, raw: Buffer.concat(trozos).toString('utf8'), headers: res.headers }));
      res.on('error', (err) => resolve({ status: 0, error: err }));
    });
    req.on('timeout', () => req.destroy(new Error('tiempo de espera agotado')));
    req.on('error', (err) => resolve({ status: 0, error: err }));
    if (cuerpo !== null) {
      req.write(cuerpo);
    }
    req.end();
  });
}

export const Api = {
  /** Configuración pública del servidor (comensales, días de antelación, menú…), una vez por petición. */
  async config() {
    const ctx = peticion();
    ctx.cfg ??= (await Api.call('cliente', 'GET', '/config')).datos();
    return ctx.cfg;
  },

  /** Llamada con la sesión del cliente; si ha caducado, se vuelve a «Entrar». */
  cliente(metodo, ruta, cuerpo = null) {
    return conSesion('cliente', metodo, ruta, cuerpo);
  },

  /** Llamada con la sesión del personal o de administración. */
  panel(metodo, ruta, cuerpo = null, extra = {}) {
    return conSesion('panel', metodo, ruta, cuerpo, extra);
  },

  /** La sesión ya no vale: aviso y a la página de entrar, para volver luego aquí. */
  sesionCaducada(zona, mensaje) {
    const ctx = peticion();
    Sesion.aviso('warning', mensaje);   // también desde JavaScript: se ve al recargar
    if (ctx.ruta.startsWith('/ajax/')) {
      Vista.json(401, { error: { code: 'unauthenticated', message: mensaje } });
    }
    const volver = ctx.metodo === 'GET' ? siguiente(ctx.uri) : null;
    Vista.redirigir(url(zona === 'cliente' ? '/entrar' : '/panel/entrar', { next: volver }));
  },

  async call(zona, metodo, ruta, cuerpo = null, extra = {}) {
    const ctx = peticion();
    const cabeceras = {
      Accept: 'application/json',
      'X-Forwarded-For': ctx.ip,
      'X-Forwarded-Proto': ctx.proto,
      ...extra,
    };
    const token = Sesion.token(zona);
    if (token !== null) {
      cabeceras.Authorization = `Bearer ${token}`;
    }
    let json = null;
    if (cuerpo !== null) {
      json = JSON.stringify(cuerpo);
      cabeceras['Content-Type'] = 'application/json';
      cabeceras['Content-Length'] = Buffer.byteLength(json);
    }
    const r = await enviar(metodo, ruta, cabeceras, json);
    if (r.status === 0) {
      console.error(`MesaLista web: no se puede conectar con el servidor (${r.error?.message ?? 'sin respuesta'})`);
      return new Respuesta(0, { error: { code: 'unreachable',
        message: 'No se puede conectar con el servidor de reservas. Inténtalo dentro de un momento.' } });
    }
    let datos = null;
    try {
      datos = JSON.parse(r.raw);
    } catch {
      // no es JSON (p. ej. el CSV de la agenda)
    }
    if (r.status === 401 && token !== null) {
      Sesion.olvidar(zona);   // el token ha caducado o ya no vale
    }
    const body = datos !== null && typeof datos === 'object' && !Array.isArray(datos) ? datos : {};
    return new Respuesta(r.status, body, r.raw, r.headers);
  },
};

async function conSesion(zona, metodo, ruta, cuerpo, extra = {}) {
  const teniaSesion = Sesion.token(zona) !== null;
  const r = await Api.call(zona, metodo, ruta, cuerpo, extra);
  if (r.status === 401 && teniaSesion) {
    Api.sesionCaducada(zona, r.message());
  }
  return r;
}
