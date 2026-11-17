// Terminar una reserva en curso (RF-25): la mesa queda libre.

import { peticion } from '../../lib/peticion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function (p) {
  Panel.exigir();
  if (peticion().metodo !== 'POST') {
    Vista.redirigir('/panel');
  }
  const r = await Api.panel('POST', `/panel/reservations/${p.id}/complete`, {});
  const res = r.body.reservation ?? null;
  Panel.resultado(r, res !== null
    ? (res.tables.length > 1 ? `Mesas ${Panel.mesas(res)} libres.` : `Mesa ${res.table} libre.`)
    : '', Panel.volver());
}
