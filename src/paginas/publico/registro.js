// Crear una cuenta de cliente (RF-01). El servidor abre la sesión al crearla.

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { siguiente } from '../../lib/html.js';

export default async function () {
  const { get, post, metodo } = peticion();
  const next = siguiente(get.next ?? null);
  if (Sesion.usuario('cliente') !== null) {
    Vista.redirigir(next);
  }

  const datos = { name: '', email: '', phone: '' };
  let errores = {};
  if (metodo === 'POST') {
    for (const campo of Object.keys(datos)) {
      datos[campo] = texto(post[campo]).trim();
    }
    const password = texto(post.password);
    if (password !== texto(post.password2)) {
      errores = { password2: 'Las contraseñas no coinciden.' };
    } else {
      const r = await Api.call('cliente', 'POST', '/auth/register', { ...datos, password });
      if (r.ok()) {
        Sesion.entrar('cliente', r.body.session, r.body.user);
        Sesion.aviso('success', 'Cuenta creada. Ya puedes reservar.');
        Vista.redirigir(next);
      }
      errores = Vista.errores(r);
    }
  }

  Vista.mostrar('publico/registro', { datos, errores, next: next === '/' ? null : next },
    { titulo: 'Crear cuenta', ancho: 'estrecho', activa: 'registro' }, Object.keys(errores).length ? 400 : 200);
}
