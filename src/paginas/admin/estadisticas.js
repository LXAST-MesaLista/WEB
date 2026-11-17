// Estadísticas de un periodo (RF-46): reservas, comensales, no presentadas,
// cancelaciones, comensales por día, reservas por hora y ocupación por servicio.

import { peticion, texto } from '../../lib/peticion.js';
import { Api } from '../../lib/api.js';
import { Formato, esFecha } from '../../lib/formato.js';
import { Panel } from '../../lib/zonas.js';
import { url } from '../../lib/html.js';

export default async function () {
  Panel.exigirAdmin();
  const { get } = peticion();
  const hoy = (await Api.config()).today;
  let hasta = texto(get.hasta, hoy);
  let desde = texto(get.desde, Formato.sumarDias(hoy, -29));
  if (!esFecha(hasta)) {
    hasta = hoy;
  }
  if (!esFecha(desde)) {
    desde = Formato.sumarDias(hasta, -29);
  }

  const r = await Api.panel('GET', url('/admin/stats', { from: desde, to: hasta }));
  Panel.mostrar('admin/estadisticas', {
    hoy,
    desde,
    hasta,
    s: r.ok() ? r.body : null,
    error: r.ok() ? null : r.message(),
  }, 'Estadísticas', 'admin-estadisticas', {}, r.ok() ? 200 : 400);
}
