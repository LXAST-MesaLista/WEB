// Reabrir un día cerrado.

import { peticion, texto } from '../../lib/peticion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function () {
  Panel.exigirAdmin();
  const { post, metodo } = peticion();
  if (metodo === 'POST') {
    const r = await Api.panel('POST', '/admin/schedule/open', { date: texto(post.date) });
    Panel.resultado(r, 'Día reabierto.', '/panel/admin/horario');
  }
  Vista.redirigir('/panel/admin/horario');
}
