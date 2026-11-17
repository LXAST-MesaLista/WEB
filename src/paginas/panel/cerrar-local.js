// «Cerrar local»: con el PIN del restaurante, termina todas las reservas en
// curso y deja libres todas las mesas.

import { peticion, texto } from '../../lib/peticion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function () {
  Panel.exigir();
  const { post, metodo } = peticion();
  if (metodo !== 'POST') {
    Vista.redirigir('/panel');
  }
  const r = await Api.panel('POST', '/panel/close', { pin: texto(post.pin) });
  const n = Number(r.body.completed ?? 0) || 0;
  Panel.resultado(r, n > 0
    ? `Local cerrado: ${n} ${n === 1 ? 'reserva terminada' : 'reservas terminadas'}, todas las mesas libres.`
    : 'Local cerrado: no había mesas ocupadas.', '/panel');
}
