// Cliente sin reserva (RF-33): mesas libres ahora y durante toda la duración
// de una reserva. Una mesa en la que cabe el grupo, o varias para unirlas.

import { peticion, texto, entero } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Formato } from '../../lib/formato.js';
import { Panel } from '../../lib/zonas.js';
import { url } from '../../lib/html.js';

export default async function () {
  Panel.exigir();
  const { get, post, metodo } = peticion();
  const personas = Math.max(1, Math.min(50, entero(get.personas ?? post.personas, 2)));
  const aqui = url('/panel/sin-reserva', { personas });

  if (metodo === 'POST') {
    const sentar = texto(post.sentar);
    const ids = /^\d+$/.test(sentar) ? [Number(sentar)] : Panel.idsMesas();
    if (ids.length === 0) {
      Sesion.aviso('warning', 'Marca una o varias mesas.');
      Vista.redirigir(aqui);
    }
    const r = await Api.panel('POST', '/panel/walkin', { party: personas, table_ids: ids });
    const res = r.body.reservation ?? null;
    Panel.resultado(r, res === null ? '' : (res.tables.length > 1
      ? `Mesas ${Panel.mesas(res)} ocupadas por ${Formato.personas(res.party)}.`
      : `Mesa ${res.table} ocupada por ${Formato.personas(res.party)}.`), r.ok() ? '/panel' : aqui);
  }

  const mesas = (await Api.panel('GET', url('/panel/walkin-tables', { party: personas }))).datos().tables;
  Panel.mostrar('panel/sin-reserva', { personas, mesas, aqui }, 'Cliente sin reserva', 'sin-reserva', { recargar: true });
}
