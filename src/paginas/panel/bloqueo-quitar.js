// Quitar un bloqueo: las mesas vuelven a ofrecerse.

import { peticion } from '../../lib/peticion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function (p) {
  Panel.exigir();
  if (peticion().metodo !== 'POST') {
    Vista.redirigir('/panel/bloqueos');
  }
  const r = await Api.panel('DELETE', `/panel/holds/${p.id}`);
  Panel.resultado(r, 'Bloqueo quitado: las mesas vuelven a ofrecerse.', '/panel/bloqueos');
}
