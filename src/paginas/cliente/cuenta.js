// Mi cuenta (RF-04): nombre y teléfono. El correo no se cambia.

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Cliente } from '../../lib/zonas.js';

export default async function () {
  const u = Cliente.exigir();
  const { post, metodo } = peticion();
  let datos = { name: u.name, phone: String(u.phone ?? '') };
  let errores = {};
  if (metodo === 'POST') {
    datos = { name: texto(post.name).trim(), phone: texto(post.phone).trim() };
    const r = await Api.cliente('PATCH', '/me', datos);
    if (r.ok()) {
      Sesion.actualizarUsuario('cliente', r.body.user);
      Sesion.aviso('success', 'Datos guardados.');
      Vista.redirigir('/cuenta');
    }
    errores = Vista.errores(r);
  }

  Vista.mostrar('cliente/cuenta', { u, datos, errores },
    { titulo: 'Mi cuenta', activa: 'cuenta', ancho: 'estrecho' }, Object.keys(errores).length ? 400 : 200);
}
