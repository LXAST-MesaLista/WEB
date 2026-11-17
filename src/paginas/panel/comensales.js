// Añadir comensales a una mesa en curso (RF-26), hasta las plazas de sus mesas.

import { peticion, entero } from '../../lib/peticion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function (p) {
  Panel.exigir();
  const { post, metodo } = peticion();
  if (metodo !== 'POST') {
    Vista.redirigir('/panel');
  }
  const r = await Api.panel('POST', `/panel/reservations/${p.id}/party`, { party: entero(post.party) });
  Panel.resultado(r, 'Comensales actualizados.', Panel.volver());
}
