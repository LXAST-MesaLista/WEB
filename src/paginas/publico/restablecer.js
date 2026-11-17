// Elegir una contraseña nueva con el enlace del correo (RF-40).
// El token del enlace se guarda en la sesión y se quita de la dirección,
// así no queda en el historial del navegador.

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';

export default async function () {
  const { get, post, metodo } = peticion();
  if (get.token !== undefined) {
    Sesion.poner('_restablecer', texto(get.token));
    Vista.redirigir('/restablecer');
  }

  const token = Sesion.leer('_restablecer');
  if (token === null) {
    Sesion.aviso('warning', 'Abre el enlace que te hemos enviado por correo o pide uno nuevo.');
    Vista.redirigir('/recuperar');
  }

  let errores = {};
  if (metodo === 'POST') {
    const password = texto(post.password);
    if (password !== texto(post.password2)) {
      errores = { password2: 'Las contraseñas no coinciden.' };
    } else {
      const r = await Api.call('cliente', 'POST', '/auth/reset', { token, password });
      if (r.ok()) {
        Sesion.quitar('_restablecer');
        Sesion.olvidar('cliente');   // el servidor ha cerrado todas las sesiones de la cuenta
        Sesion.aviso('success', 'Contraseña cambiada. Inicia sesión con la nueva.');
        Vista.redirigir('/entrar');
      }
      if (r.code() === 'reset_invalid') {
        Sesion.quitar('_restablecer');
        Sesion.aviso('danger', r.message());
        Vista.redirigir('/recuperar');
      }
      errores = Vista.errores(r);
    }
  }

  Vista.mostrar('publico/restablecer', { errores },
    { titulo: 'Elige una contraseña nueva', ancho: 'estrecho' }, Object.keys(errores).length ? 400 : 200);
}
