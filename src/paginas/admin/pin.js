// Fijar o cambiar el PIN de «Cerrar local» (4 a 8 cifras). Se escribe dos veces.

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function () {
  Panel.exigirAdmin();
  const { post, metodo } = peticion();
  if (metodo === 'POST') {
    const pin = texto(post.pin);
    if (pin !== texto(post.pin2)) {
      Sesion.aviso('danger', 'Los dos PIN no coinciden.');
      Vista.redirigir('/panel/admin/parametros');
    }
    const r = await Api.panel('PUT', '/admin/close-pin', { pin });
    Panel.resultado(r, 'PIN guardado.', '/panel/admin/parametros');
  }
  Vista.redirigir('/panel/admin/parametros');
}
