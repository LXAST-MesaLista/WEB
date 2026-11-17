// Solicitudes de grupo (RF-43): pendientes, para aceptar eligiendo mesas o
// rechazar con un motivo, y las respondidas en los últimos 30 días.

import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function () {
  Panel.exigir();
  const solicitudes = (await Api.panel('GET', '/panel/group-requests')).datos().requests;
  Panel.mostrar('panel/grupos', {
    cfg: await Api.config(),
    pendientes: solicitudes.filter((g) => g.status === 'pending'),
    respondidas: solicitudes.filter((g) => g.status !== 'pending'),
  }, 'Solicitudes de grupo', 'grupos', { recargar: true });
}
