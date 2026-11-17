// MesaLista · web: protección CSRF.
//
// Como la web usa una cookie de sesión, cada formulario lleva un token oculto
// (y cada llamada de JavaScript, la cabecera X-CSRF-Token). Sin él, otra web
// no puede hacer peticiones en nombre del usuario.

import { randomBytes, timingSafeEqual } from 'node:crypto';
import { peticion, Fin } from './peticion.js';
import { esc } from './html.js';

export const Csrf = {
  token() {
    const datos = peticion().sesion.datos;
    return (datos._csrf ??= randomBytes(32).toString('hex'));
  },

  campo() {
    return `<input type="hidden" name="_csrf" value="${esc(Csrf.token())}">`;
  },

  /** En cada POST: si el token no coincide, se corta la petición. */
  comprobar() {
    const ctx = peticion();
    const recibido = ctx.post._csrf ?? ctx.req.headers['x-csrf-token'] ?? '';
    const esperado = Buffer.from(Csrf.token());
    const valido = typeof recibido === 'string'
      && Buffer.byteLength(recibido) === esperado.length
      && timingSafeEqual(Buffer.from(recibido), esperado);
    if (valido) {
      return;
    }
    if (ctx.ruta.startsWith('/ajax/')) {
      throw new Fin('json', { status: 400, datos: { error: { code: 'csrf', message: 'La página ha caducado. Recárgala.' } } });
    }
    throw new Fin('error', { status: 400, titulo: 'La página ha caducado', texto: 'Vuelve atrás, recarga la página y vuelve a intentarlo.' });
  },
};
