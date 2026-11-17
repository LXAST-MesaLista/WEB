// Aceptar una solicitud de grupo: el personal elige mesas libres durante
// toda la reserva hasta sumar plazas para el grupo (la primera que no es
// extra es la principal) y puede dejar un mensaje para el cliente.

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function (p) {
  Panel.exigir();
  const { post, metodo } = peticion();
  const id = p.id;
  const aqui = `/panel/grupos/${id}/aceptar`;
  const cfg = await Api.config();

  if (metodo === 'POST') {
    const r = await Api.panel('POST', `/panel/group-requests/${id}/accept`, {
      table_ids: Panel.idsMesas(), reply: texto(post.reply).trim(),
    });
    Panel.resultado(r, Number(cfg.deposit_per_person) > 0 && r.body.reservation?.status === 'pending_payment'
      ? 'Solicitud aceptada: el cliente ya puede pagar la señal.'
      : 'Solicitud aceptada: reserva confirmada.', r.ok() ? '/panel/grupos' : aqui);
  }

  const solicitud = (await Api.panel('GET', '/panel/group-requests')).datos().requests.find((g) => g.id === id) ?? null;
  if (solicitud === null || solicitud.status !== 'pending') {
    Sesion.aviso('warning', 'Esta solicitud ya está respondida o cancelada.');
    Vista.redirigir('/panel/grupos');
  }
  const mesas = (await Api.panel('GET', `/panel/group-requests/${id}/tables`)).datos().tables;
  Panel.mostrar('panel/grupo-aceptar', { g: solicitud, mesas, aqui }, 'Aceptar solicitud de grupo', 'grupos');
}
