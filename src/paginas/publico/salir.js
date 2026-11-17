// Cerrar la sesión del cliente (RF-03). Solo por POST, con el token CSRF:
// un enlace de otra web no puede cerrar la sesión de nadie.

import { peticion } from '../../lib/peticion.js';
import { Sesion, regenerar } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';

export default async function () {
  if (peticion().metodo !== 'POST') {
    Vista.redirigir('/');
  }
  if (Sesion.token('cliente') !== null) {
    await Api.call('cliente', 'POST', '/auth/logout', {});   // si ya había caducado, da igual
  }
  Sesion.olvidar('cliente');
  regenerar();
  Sesion.aviso('info', 'Has cerrado la sesión.');
  Vista.redirigir('/');
}
