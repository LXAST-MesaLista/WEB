// Cancelar una reserva desde el restaurante (RF-31). Con señal pagada
// (RF-44), el personal decide si se devuelve: refund = 1 o 0.

import { peticion } from '../../lib/peticion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function (p) {
  Panel.exigir();
  const { post, metodo } = peticion();
  if (metodo !== 'POST') {
    Vista.redirigir('/panel/agenda');
  }
  const cuerpo = post.refund !== undefined ? { refund: post.refund === '1' } : {};
  const r = await Api.panel('POST', `/panel/reservations/${p.id}/cancel`, cuerpo);
  const mensaje = cuerpo.refund === true
    ? 'Reserva cancelada. Se devuelve la señal al cliente.'
    : cuerpo.refund === false
      ? 'Reserva cancelada sin devolver la señal.'
      : 'Reserva cancelada.';
  Panel.resultado(r, mensaje, Panel.volver('/panel/agenda'));
}
