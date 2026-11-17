// Guardar los cambios de una mesa. Al desactivarla o hacerla «solo unir»,
// el servidor mueve sus reservas futuras a otra mesa o, si no hay, las
// cancela avisando al titular: se informa de cuántas.

import { peticion } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel, Admin } from '../../lib/zonas.js';

export default async function (p) {
  Panel.exigirAdmin();
  if (peticion().metodo !== 'POST') {
    Vista.redirigir('/panel/admin/mesas');
  }
  const r = await Api.panel('PATCH', `/admin/tables/${p.id}`, Admin.datosMesa());
  let mensaje = `Mesa ${r.ok() ? Admin.codigoMesa(r) : ''} guardada.`;
  const movidas = Number(r.body.moved ?? 0) || 0;
  const canceladas = Number(r.body.cancelled ?? 0) || 0;
  if (movidas || canceladas) {
    mensaje += ` Reservas movidas: ${movidas}. Canceladas: ${canceladas}.`;
  }
  if (r.ok() && canceladas > 0) {
    Sesion.aviso('warning', mensaje);
    Vista.redirigir('/panel/admin/mesas');
  }
  Panel.resultado(r, mensaje, '/panel/admin/mesas');
}
