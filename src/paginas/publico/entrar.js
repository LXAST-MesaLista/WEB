// Entrar como cliente (RF-02). Al terminar se vuelve a «next» (si lo hay).

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

  let email = '';
  let errores = {};
  if (metodo === 'POST') {
    email = texto(post.email).trim();
    const r = await Api.call('cliente', 'POST', '/auth/login', { email, password: texto(post.password) });
    if (r.ok()) {
      Sesion.entrar('cliente', r.body.session, r.body.user);
      Vista.redirigir(next);
    }
    errores = { _: r.message() };
  }

  Vista.mostrar('publico/entrar', { email, errores, next: next === '/' ? null : next },
    { titulo: 'Iniciar sesión', ancho: 'estrecho', activa: 'entrar' }, Object.keys(errores).length ? 400 : 200);
}
