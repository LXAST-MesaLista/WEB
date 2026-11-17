// MesaLista · web: fechas, estados y cantidades en español, para las plantillas.

import { randomUUID } from 'node:crypto';
import { esc } from './html.js';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Estados de una reserva: [texto, clase de Bootstrap]. */
const ESTADOS = {
  confirmed: ['Confirmada', 'text-bg-success'],
  seated: ['En curso', 'text-bg-primary'],
  completed: ['Completada', 'text-bg-secondary'],
  cancelled: ['Cancelada', 'text-bg-light border'],
  no_show: ['No presentada', 'text-bg-dark'],
  pending_payment: ['Pendiente de pago', 'text-bg-warning'],
};

/** Estados de una solicitud de grupo. */
const SOLICITUDES = {
  pending: ['Esperando respuesta', 'text-bg-warning'],
  accepted: ['Aceptada', 'text-bg-success'],
  rejected: ['No aceptada', 'text-bg-danger'],
  expired: ['Caducada', 'text-bg-light border'],
  cancelled: ['Cancelada', 'text-bg-light border'],
};

const DIA_MS = 86_400_000;

/** Fecha (sin hora) de «2026-11-07» o «2026-11-07 21:30», en UTC para contar días sin sorpresas. */
function fecha(iso) {
  return new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
}

const isoDe = (d) => d.toISOString().slice(0, 10);

const badge = (lista, estado) => {
  const [texto, clase] = lista[estado] ?? [estado, 'text-bg-secondary'];
  return `<span class="badge ${clase}">${esc(texto)}</span>`;
};

export const Formato = {
  /** «sábado 7 de noviembre» */
  fechaLarga(iso) {
    const d = fecha(iso);
    return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
  },

  /** «sáb 7 nov» */
  fechaCorta(iso) {
    const d = fecha(iso);
    return `${DIAS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MESES[d.getUTCMonth()].slice(0, 3)}`;
  },

  /** «Hoy», «Mañana» o «lun», para la tira de días. */
  diaRelativo(iso, hoy) {
    const dias = Math.round((fecha(iso) - fecha(hoy)) / DIA_MS);
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Mañana';
    return DIAS[fecha(iso).getUTCDay()].slice(0, 3);
  },

  /** «2026-11-07 21:30» → «sábado 7 de noviembre a las 21:30» */
  fechaHora(isoHora) {
    return `${Formato.fechaLarga(isoHora)} a las ${String(isoHora).slice(11, 16)}`;
  },

  personas(n) {
    n = Number(n);
    return n === 1 ? '1 persona' : `${n} personas`;
  },

  /** Etiqueta (HTML) con el estado de una reserva. */
  estado(estado) {
    return badge(ESTADOS, estado);
  },

  estadoSolicitud(estado) {
    return badge(SOLICITUDES, estado);
  },

  /** Reserva pendiente (aún por venir o en curso). */
  pendiente(r) {
    return ['confirmed', 'seated', 'pending_payment'].includes(r.status);
  },

  /** Días entre desde y desde + n, en ISO. */
  dias(desde, n) {
    const d = fecha(desde).getTime();
    const lista = [];
    for (let i = 0; i <= n; i++) {
      lista.push(isoDe(new Date(d + i * DIA_MS)));
    }
    return lista;
  },

  sumarDias(iso, n) {
    return isoDe(new Date(fecha(iso).getTime() + n * DIA_MS));
  },

  /** Hoy en Madrid (si el servidor de MesaLista no responde). */
  hoy() {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());
  },

  /** UUID v4 para que una reserva no se cree dos veces si se repite el envío (RF-10). */
  uuid() {
    return randomUUID();
  },
};

/** ¿«2026-11-07»? */
export const esFecha = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
/** ¿«21:30»? */
export const esHora = (v) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
