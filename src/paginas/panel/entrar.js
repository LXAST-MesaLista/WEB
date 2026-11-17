// Entrar al panel (personal y administración). Sesión del panel: 8 horas como
// máximo y se cierra tras 30 minutos sin actividad (RS-05).

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { siguiente } from '../../lib/html.js';

export default async function () {
  const { get, post, metodo } = peticion();
  let next = siguiente(get.next ?? null, '/panel');
  next = next.startsWith('/panel') ? next : '/panel';
  if (Sesion.usuario('panel') !== null) {
    Vista.redirigir(next);
  }

  let email = '';
  let error = null;
  if (metodo === 'POST') {
    email = texto(post.email).trim();
    const r = await Api.call('panel', 'POST', '/panel/login', { email, password: texto(post.password) });
    if (r.ok()) {
      Sesion.entrar('panel', r.body.session, r.body.user);
      Vista.redirigir(next);
    }
    error = r.message();
  }

  Vista.mostrar('panel/entrar', { email, error, next: next === '/panel' ? null : next },
    { titulo: 'Panel del restaurante', zona: 'panel', ancho: 'estrecho' }, error !== null ? 400 : 200);
}
