// RF-34: el panel pregunta cada pocos segundos por la marca de cambios del
// servidor y solo recarga la página si ha cambiado. La consulta va con
// «X-Background: 1»: no cuenta como actividad para el cierre por inactividad.

import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function () {
  Panel.exigir();
  const r = await Api.panel('GET', '/panel/version', null, { 'X-Background': '1' });
  if (!r.ok()) {
    Vista.json(r.status || 503, { error: { code: r.code(), message: r.message() } });
  }
  Vista.json(200, { version: r.body.version });
}
