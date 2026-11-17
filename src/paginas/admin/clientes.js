// Clientes registrados, con búsqueda por nombre, correo o teléfono, y sus
// reservas (totales, pendientes, no presentadas y la última).

import { peticion, texto } from '../../lib/peticion.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';
import { url, recortar } from '../../lib/html.js';

export default async function () {
  Panel.exigirAdmin();
  const q = texto(peticion().get.q).trim();
  const clientes = (await Api.panel('GET', url('/admin/clients', { q: recortar(q, 80) }))).datos().clients;
  Panel.mostrar('admin/clientes', { q, clientes }, 'Clientes', 'admin-clientes');
}
