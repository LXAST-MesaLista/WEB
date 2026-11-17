// Cerrar la sesión del panel (solo por POST, con el token CSRF).

import { peticion } from '../../lib/peticion.js';
import { Sesion, regenerar } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';

export default async function () {
  if (peticion().metodo === 'POST' && Sesion.token('panel') !== null) {
    await Api.call('panel', 'POST', '/panel/logout', {});
    Sesion.olvidar('panel');
    regenerar();
    Sesion.aviso('info', 'Has cerrado la sesión del panel.');
  }
  Vista.redirigir('/panel/entrar');
}
