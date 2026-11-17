// Añadir a la cuenta una reserva hecha en el local (RF-30), con el código
// del ticket y el teléfono con el que se hizo.

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Cliente } from '../../lib/zonas.js';

export default async function () {
  const u = Cliente.exigir();
  const { post, metodo } = peticion();
  let datos = { code: '', phone: String(u.phone ?? '') };
  let errores = {};
  if (metodo === 'POST') {
    datos = { code: texto(post.code).trim(), phone: texto(post.phone).trim() };
    const r = await Api.cliente('POST', '/reservations/link', datos);
    if (r.ok()) {
      Sesion.aviso('success', 'Reserva añadida. A partir de ahora vale el QR de la web, no el del ticket.');
      Vista.redirigir(`/reservas/${Number(r.body.reservation.id)}`);
    }
    errores = Vista.errores(r, {}, { phone: 'Teléfono', code: 'Código de reserva' });
  }

  Vista.mostrar('cliente/vincular', { datos, errores },
    { titulo: 'Añadir una reserva del local', ancho: 'estrecho' }, Object.keys(errores).length ? 400 : 200);
}
