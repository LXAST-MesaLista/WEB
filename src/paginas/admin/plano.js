// Guardar el plano de una zona: posición (x de 0 a 1000, y de 0 a 600) y
// forma de cada mesa.

import { peticion, texto, lista, entero } from '../../lib/peticion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';
import { url } from '../../lib/html.js';

export default async function () {
  Panel.exigirAdmin();
  const { get, post, metodo } = peticion();
  const zona = texto(get.zona);
  const volver = url('/panel/admin/mesas', { zona });
  if (metodo !== 'POST') {
    Vista.redirigir(volver);
  }
  const mesas = [];
  for (const t of lista(post.tables)) {
    if (t === null || typeof t !== 'object') {
      continue;
    }
    mesas.push({
      id: entero(t.id),
      pos_x: Math.max(0, Math.min(1000, entero(t.pos_x))),
      pos_y: Math.max(0, Math.min(600, entero(t.pos_y))),
      shape: t.shape === 'round' ? 'round' : 'rect',
    });
  }
  const r = await Api.panel('PUT', '/admin/tables/layout', { tables: mesas });
  Panel.resultado(r, 'Plano de la sala guardado.', volver);
}
