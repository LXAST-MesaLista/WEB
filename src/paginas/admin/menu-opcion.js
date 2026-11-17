// Activar o desactivar una opción de menú (las reservas que ya la tienen la conservan).

import { peticion } from '../../lib/peticion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function (p) {
  Panel.exigirAdmin();
  const { post, metodo } = peticion();
  if (metodo === 'POST') {
    const activa = post.active === '1';
    const r = await Api.panel('PATCH', `/admin/menu-options/${p.id}`, { active: activa });
    Panel.resultado(r, activa ? 'Opción activada.' : 'Opción desactivada.', '/panel/admin/parametros');
  }
  Vista.redirigir('/panel/admin/parametros');
}
