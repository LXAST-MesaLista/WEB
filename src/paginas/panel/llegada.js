// Registrar la llegada sin QR, buscando en la agenda (RF-21 a RF-23). Si el
// cliente llega antes de su ventana y la mesa está libre, se pregunta si se
// registra igualmente (la reserva mantiene su hora de fin).

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
  const id = p.id;
  const volver = Panel.volver('/panel/agenda');
  const r = await Api.panel('POST', `/panel/reservations/${id}/arrive`, { early: post.early === '1' });
  if (r.code() === 'too_early' && r.extra('early_possible') === true) {
    Panel.mostrar('panel/llegada-anticipada',
      { mensaje: r.message(), accion: `/panel/reservas/${id}/llegada`, campos: {}, volver },
      'Llegada anticipada', 'agenda');
  }
  Panel.resultado(r, Panel.textoLlegada(r.body.reservation ?? null), volver);
}
