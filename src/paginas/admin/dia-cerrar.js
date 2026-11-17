// Cerrar un día: ya no se ofrece ninguna hora (las reservas existentes se mantienen).

import { peticion, texto } from '../../lib/peticion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function () {
  Panel.exigirAdmin();
  const { post, metodo } = peticion();
  if (metodo === 'POST') {
    const r = await Api.panel('POST', '/admin/schedule/closed', { date: texto(post.date) });
    Panel.resultado(r, 'Día cerrado: ya no se ofrece ninguna hora. Las reservas existentes se mantienen.', '/panel/admin/horario');
  }
  Vista.redirigir('/panel/admin/horario');
}
