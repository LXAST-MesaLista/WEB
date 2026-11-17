// Eliminar la cuenta (RF-05), confirmando con la contraseña. El servidor
// cancela las reservas pendientes y borra los datos personales.

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion, regenerar } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Cliente } from '../../lib/zonas.js';

export default async function () {
  Cliente.exigir();
  const { post, metodo } = peticion();
  if (metodo !== 'POST') {
    Vista.redirigir('/cuenta');
  }
  const r = await Api.cliente('DELETE', '/me', { password: texto(post.password) });
  if (!r.ok()) {
    Sesion.aviso('danger', r.message());
    Vista.redirigir('/cuenta');
  }
  Sesion.olvidar('cliente');
  regenerar();
  Sesion.aviso('info', 'Tu cuenta se ha eliminado.');
  Vista.redirigir('/');
}
