// Eliminar una mesa (solo si no tiene reservas pendientes ni en curso; si
// las tiene, el servidor lo explica en un aviso destacado).

import { peticion } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function (p) {
  Panel.exigirAdmin();
  if (peticion().metodo !== 'POST') {
    Vista.redirigir('/panel/admin/mesas');
  }
  const r = await Api.panel('DELETE', `/admin/tables/${p.id}`);
  if (r.code() === 'table_in_use') {
    Sesion.aviso('alerta', r.message());
    Vista.redirigir('/panel/admin/mesas');
  }
  Panel.resultado(r, `Mesa ${r.body.deleted ?? ''} eliminada.`, '/panel/admin/mesas');
}
