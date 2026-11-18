// MesaLista · web: utilidades de cada zona (cliente, panel y administración).

import { peticion, texto, lista, entero } from './peticion.js';
import { Sesion } from './sesion.js';
import { Vista } from './vista.js';
import { Api } from './api.js';
import { Formato } from './formato.js';
import { url, siguiente } from './html.js';

const esAjax = () => peticion().ruta.startsWith('/ajax/');
const esPost = () => peticion().metodo === 'POST';
const actual = () => siguiente(peticion().uri);

/** Ids enteros, sin repetir, de una lista de un formulario (solo cifras). */
function ids(valor) {
  return [...new Set(lista(valor).filter((v) => typeof v === 'string' && /^\d+$/.test(v)).map(Number))];
}

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

export const Cliente = {
  /** Páginas que necesitan sesión: sin ella, a «Entrar» y luego de vuelta aquí. */
  exigir() {
    const u = Sesion.usuario('cliente');
    if (u === null) {
      if (esAjax()) {
        Vista.json(401, { error: { code: 'unauthenticated', message: 'Inicia sesión para continuar.' } });
      }
      Vista.redirigir(url('/entrar', { next: esPost() ? null : actual() }));
    }
    return u;
  },

  /** Opciones de menú, nota y consentimiento enviados en el formulario. */
  extras() {
    const post = peticion().post;
    return {
      menu_options: ids(post.menu_options),
      note: texto(post.note).trim(),
      consent: post.consent === '1',
    };
  },

  /** Los extras como los espera la API. */
  extrasApi(extras) {
    return {
      menu_options: extras.menu_options,
      note: extras.note === '' ? null : extras.note,
      consent: extras.consent,
    };
  },

  /**
   * Vuelta de PayPal (?pago=ok|cancelado|caducado|error): aviso y, para que
   * no se repita al recargar, la misma página sin el parámetro.
   */
  resultadoPago(sinParametro) {
    const pago = peticion().get.pago;
    if (pago === undefined) {
      return;
    }
    const [tipo, mensaje] = {
      ok: ['success', 'Señal pagada: tu reserva de grupo está confirmada.'],
      cancelado: ['warning', 'Has cancelado el pago. Aún puedes pagar antes de que termine el plazo.'],
      caducado: ['danger', 'El plazo para pagar había terminado: no se te ha cobrado nada.'],
    }[texto(pago)] ?? ['danger', 'No se ha podido completar el pago. No se te ha cobrado nada; inténtalo de nuevo.'];
    Sesion.aviso(tipo, mensaje);
    Vista.redirigir(sinParametro);
  },
};

// ---------------------------------------------------------------------------
// Panel del restaurante (personal y administración)
// ---------------------------------------------------------------------------

export const Panel = {
  /** Páginas del panel: sin sesión del personal, a /panel/entrar y luego de vuelta aquí. */
  exigir() {
    const u = Sesion.usuario('panel');
    if (u === null) {
      if (esAjax()) {
        Vista.json(401, { error: { code: 'unauthenticated', message: 'Inicia sesión en el panel.' } });
      }
      Vista.redirigir(url('/panel/entrar', { next: esPost() ? null : actual() }));
    }
    return u;
  },

  /** Solo administración (RS-04). El servidor lo vuelve a comprobar en cada llamada. */
  exigirAdmin() {
    const u = Panel.exigir();
    if (u.role !== 'admin') {
      Vista.error(403, 'Solo para administración', 'Esta sección es solo para las cuentas de administración.');
    }
    return u;
  },

  esAdmin() {
    return Sesion.usuario('panel')?.role === 'admin';
  },

  /** Muestra una página del panel (diseño ancho, menú del panel). */
  mostrar(plantilla, datos, titulo, activa, opc = {}, status = 200) {
    Vista.mostrar(plantilla, datos, { titulo, zona: 'panel', ancho: 'ancho', activa, ...opc }, status);
  },

  /** Solicitudes de grupo sin responder, para el número junto a «Grupos» en el menú. */
  async gruposPendientes() {
    if (Sesion.token('panel') === null) {
      return 0;
    }
    const r = await Api.call('panel', 'GET', '/panel/group-requests', null, { 'X-Background': '1' });
    return r.ok() ? (r.body.requests ?? []).filter((g) => g.status === 'pending').length : 0;
  },

  /**
   * Resultado de una acción: aviso y vuelta a la página de origen. Los
   * errores marcados como «alerta» por el servidor (p. ej. no queda mesa
   * para un cliente que llega) se muestran en una ventana que hay que cerrar.
   */
  resultado(r, okMensaje, volver) {
    if (r.ok()) {
      Sesion.aviso('success', okMensaje);
    } else {
      Sesion.aviso(r.alerta() ? 'alerta' : 'danger', r.message());
    }
    Vista.redirigir(volver);
  },

  /** Vuelta segura a una página del panel («volver» del formulario). */
  volver(porDefecto = '/panel') {
    const { post, get } = peticion();
    const v = siguiente(post.volver ?? get.volver ?? null, porDefecto);
    return v.startsWith('/panel') ? v : porDefecto;
  },

  /** «Llegada registrada: mesa S-1 · 2 personas · Ana». */
  textoLlegada(r) {
    if (!r) {
      return '';
    }
    return `Llegada registrada: ${r.tables.length > 1 ? 'mesas ' : 'mesa '}${Panel.mesas(r)}`
      + ` · ${Formato.personas(r.party)}${r.name !== null ? ` · ${r.name}` : ''}`;
  },

  /**
   * Posición de cada mesa en el plano (1000 × 600): la guardada o, si no
   * tiene, un hueco de una cuadrícula al pie del plano.
   */
  colocar(mesas) {
    let i = 0;
    return mesas.map((t) => {
      if (t.pos_x === null || t.pos_y === null) {
        t = { ...t, pos_x: 100 + (i % 6) * 160, pos_y: 600 - 70 - Math.floor(i / 6) * 120 };
        i++;
      }
      return t;
    });
  },

  /** «S-1 + S-2» */
  mesas(r) {
    return (r.tables?.length ? r.tables : [r.table]).join(' + ');
  },

  /** Origen de una reserva para el personal. */
  origen(r) {
    switch (r.source) {
      case 'app': return 'Web o app';
      case 'local': return r.linked ? 'Local · vinculada' : 'Local';
      case 'walkin': return 'Sin reserva';
      default: return r.source;
    }
  },

  /** Estado de la señal de un grupo, para la agenda. */
  senal(r) {
    const d = r.deposit;
    if (d === null || d === undefined) {
      return null;
    }
    if (r.status === 'pending_payment') {
      return `Señal ${d.amount} · paga hasta ${d.due !== null ? String(d.due).slice(11) : '—'}`;
    }
    switch (d.payment) {
      case 'captured': return `Señal pagada ${d.amount}`;
      case 'refund_pending': return `Señal ${d.amount} · devolviendo`;
      case 'refunded': return `Señal ${d.amount} devuelta`;
      default: return null;
    }
  },

  /** Nombres de las opciones de menú elegidas (hace falta haber llamado antes a Api.config()). */
  opciones(lista) {
    const nombres = new Map((peticion().cfg?.menu_options ?? []).map((o) => [o.id, o.name]));
    return (lista ?? []).map((id) => nombres.get(id)).filter((n) => n !== undefined && n !== null && n !== '');
  },

  /** Ids de mesa enviados en un formulario (checkboxes table_ids[]). */
  idsMesas(nombre = 'table_ids') {
    return ids(peticion().post[nombre]);
  },
};

// ---------------------------------------------------------------------------
// Administración
// ---------------------------------------------------------------------------

export const Admin = {
  /** Parámetros del servicio, con su nombre en pantalla (RF-37). */
  PARAMETROS: {
    duration_min: 'Duración de la reserva (minutos)',
    slot_step_min: 'Horas de inicio cada (minutos)',
    min_advance_min: 'Antelación mínima (minutos)',
    max_advance_days: 'Antelación máxima (días)',
    min_party: 'Comensales mínimos por reserva',
    max_party: 'Comensales máximos por reserva',
    max_future_per_client: 'Reservas confirmadas futuras por cliente',
    change_deadline_h: 'Plazo para modificar o cancelar (horas antes del inicio)',
    arrival_before_min: 'Ventana de llegada: minutos antes del inicio',
    arrival_after_min: 'Ventana de llegada: minutos después del inicio',
    max_group_party: 'Comensales máximos de una solicitud de grupo',
    deposit_per_person: 'Señal de los grupos por persona (€, 0 = sin señal)',
    deposit_hold_min: 'Minutos para pagar la señal (las mesas quedan retenidas)',
  },

  DIAS: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],

  /** Datos de una mesa enviados en el formulario, como los espera la API. */
  datosMesa() {
    const post = peticion().post;
    return {
      zone: texto(post.zone).trim(),
      number: entero(post.number),
      min_capacity: entero(post.min_capacity),
      max_capacity: entero(post.max_capacity),
      join_only: post.join_only === '1',
      active: post.active === '1',
    };
  },

  /** Código de la mesa guardada (S-1…), a partir de la respuesta de la API. */
  codigoMesa(r) {
    const t = (r.body.tables ?? []).find((m) => m.id === (r.body.table_id ?? null));
    return t ? t.code : '';
  },

  /** «7,5 %» o «—». */
  porcentaje(v) {
    return v === null || v === undefined ? '—' : `${String(v).replace('.', ',')} %`;
  },
};
