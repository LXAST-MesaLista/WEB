// «Entendido» en los avisos del restaurante (RF-32): se marcan como leídos.

import { peticion } from '../../lib/peticion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Cliente } from '../../lib/zonas.js';

export default async function () {
  Cliente.exigir();
  if (peticion().metodo === 'POST') {
    await Api.cliente('POST', '/me/notifications/read', {});
  }
  Vista.redirigir('/');
}
