// Horario (RF-36): franjas de servicio de cada día de la semana y días cerrados.
// Cada día muestra sus franjas y una fila vacía para añadir otra; una franja
// con «Quitar» marcado (o sin horas) no se guarda.

import { peticion, texto, lista, entero } from '../../lib/peticion.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function () {
  Panel.exigirAdmin();
  const { post, metodo } = peticion();
  if (metodo === 'POST') {
    const franjas = [];
    for (const s of lista(post.slots)) {
      if (s === null || typeof s !== 'object' || s.quitar === '1' || texto(s.open) === '' || texto(s.close) === '') {
        continue;
      }
      franjas.push({ weekday: entero(s.weekday), open: texto(s.open), close: texto(s.close) });
    }
    const r = await Api.panel('PUT', '/admin/schedule/slots', { slots: franjas });
    Panel.resultado(r, 'Franjas guardadas. Afectan a las reservas nuevas.', '/panel/admin/horario');
  }

  const h = (await Api.panel('GET', '/admin/schedule')).datos();
  Panel.mostrar('admin/horario', { franjas: h.slots, cerrados: h.closed_days, hoy: (await Api.config()).today },
    'Horario', 'admin-horario');
}
