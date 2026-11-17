// Rechazar una solicitud de grupo con un motivo, que se envía al cliente.

import { peticion, texto } from '../../lib/peticion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function (p) {
  Panel.exigir();
  const { post, metodo } = peticion();
  if (metodo !== 'POST') {
    Vista.redirigir('/panel/grupos');
  }
  const r = await Api.panel('POST', `/panel/group-requests/${p.id}/reject`, { reply: texto(post.reply).trim() });
  Panel.resultado(r, 'Solicitud rechazada. El cliente recibe el motivo por correo.', '/panel/grupos');
}
