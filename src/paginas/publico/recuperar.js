// ¿Has olvidado tu contraseña? (RF-40). El servidor envía un enlace a
// /restablecer?token=… y responde lo mismo exista o no la cuenta.

import { peticion, texto } from '../../lib/peticion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';

export default async function () {
  const { post, metodo } = peticion();
  let email = '';
  let errores = {};
  if (metodo === 'POST') {
    email = texto(post.email).trim();
    const r = await Api.call('cliente', 'POST', '/auth/forgot', { email });
    if (r.ok()) {
      Vista.mostrar('publico/recuperar-enviado', { email }, { titulo: 'Revisa tu correo', ancho: 'estrecho' });
    }
    errores = Vista.errores(r);
  }

  Vista.mostrar('publico/recuperar', { email, errores },
    { titulo: '¿Has olvidado tu contraseña?', ancho: 'estrecho' }, Object.keys(errores).length ? 400 : 200);
}
