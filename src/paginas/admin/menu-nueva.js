// Añadir una opción de menú.

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function () {
  Panel.exigirAdmin();
  const { post, metodo } = peticion();
  if (metodo === 'POST') {
    const r = await Api.panel('POST', '/admin/menu-options', { name: texto(post.name).trim() });
    if (!r.ok() && r.field() === 'name') {
      Sesion.aviso('danger', r.message().replaceAll('«name»', '«Nueva opción»'));
      Vista.redirigir('/panel/admin/parametros');
    }
    Panel.resultado(r, 'Opción de menú añadida.', '/panel/admin/parametros');
  }
  Vista.redirigir('/panel/admin/parametros');
}
