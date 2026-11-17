// Cancelar una solicitud de grupo que aún no tiene respuesta.

import { peticion } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Cliente } from '../../lib/zonas.js';

export default async function (p) {
  Cliente.exigir();
  if (peticion().metodo === 'POST') {
    const r = await Api.cliente('POST', `/group-requests/${p.id}/cancel`, {});
    Sesion.aviso(r.ok() ? 'success' : 'danger', r.ok() ? 'Solicitud cancelada.' : r.message());
  }
  Vista.redirigir('/reservas');
}
