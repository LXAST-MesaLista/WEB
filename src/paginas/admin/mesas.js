// Mesas (RF-35): alta, cambios, desactivar o eliminar, y el plano de cada
// zona. POST aquí = mesa nueva; los cambios de una mesa van a /panel/admin/mesas/{id}.

import { peticion } from '../../lib/peticion.js';
import { Api } from '../../lib/api.js';
import { Panel, Admin } from '../../lib/zonas.js';

export default async function () {
  Panel.exigirAdmin();
  const { get, metodo } = peticion();
  if (metodo === 'POST') {
    const r = await Api.panel('POST', '/admin/tables', Admin.datosMesa());
    Panel.resultado(r, `Mesa ${r.ok() ? Admin.codigoMesa(r) : ''} añadida.`, '/panel/admin/mesas');
  }

  const mesas = (await Api.panel('GET', '/admin/tables')).datos().tables;
  const conPlano = mesas.filter((t) => !t.join_only);
  const zonas = [...new Set(conPlano.map((t) => t.zone))];
  const zona = zonas.includes(get.zona) ? get.zona : (zonas[0] ?? '');

  Panel.mostrar('admin/mesas', {
    mesas,
    zonasLista: [...new Set(['Sala', 'Terraza', 'Extra', ...mesas.map((t) => t.zone)])],
    zonas,
    zona,
    plano: Panel.colocar(conPlano.filter((t) => t.zone === zona)),
  }, 'Mesas y plano', 'admin-mesas');
}
