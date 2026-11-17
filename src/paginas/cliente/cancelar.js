// Cancelar una reserva (RF-16). Si tenía señal pagada, el servidor la devuelve.

import { peticion } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Cliente } from '../../lib/zonas.js';

export default async function (p) {
  Cliente.exigir();
  const id = p.id;
  if (peticion().metodo !== 'POST') {
    Vista.redirigir(`/reservas/${id}`);
  }
  const r = await Api.cliente('POST', `/reservations/${id}/cancel`, {});
  if (r.ok()) {
    Sesion.aviso('success', 'Reserva cancelada. Te hemos enviado un correo.');
  } else {
    Sesion.aviso('danger', r.message());
  }
  Vista.redirigir(`/reservas/${id}`);
}
