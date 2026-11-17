// MesaLista · comportamiento del panel del restaurante (sin scripts en línea: CSP).
'use strict';

(() => {
  const body = document.body;
  if (!body.hasAttribute('data-panel')) return;

  // -------------------------------------------------------------------
  // RF-34: cada 2 segundos se pregunta por la marca de cambios del servidor.
  // Si cambia, las páginas con data-recargar se recargan, salvo que haya un
  // formulario a medio rellenar, una ventana abierta o un campo con el foco.
  // Estas consultas no cuentan como actividad para el cierre por inactividad.
  // -------------------------------------------------------------------
  let version = null;
  let sucio = false;

  document.querySelectorAll('form:not([data-auto-enviar])').forEach((form) => {
    form.addEventListener('input', () => { sucio = true; });
    form.addEventListener('change', () => { sucio = true; });
  });

  const ocupado = () => sucio
    || document.querySelector('.modal.show, .collapse.show form, .dropdown-menu.show') !== null
    || (document.activeElement && document.activeElement.matches('input, textarea, select'));

  let pendiente = false;
  async function consultar() {
    try {
      const res = await fetch('/ajax/panel/version', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      if (res.status === 401) {
        window.location.reload();   // la web lleva a «Entrar» con el aviso
        return;
      }
      if (res.ok) {
        const datos = await res.json();
        if (version !== null && datos.version !== version) pendiente = true;
        version = datos.version;
      }
    } catch (e) {
      // Sin conexión un momento: se vuelve a intentar.
    }
    if (pendiente && body.hasAttribute('data-recargar') && !ocupado()) {
      window.location.reload();
      return;
    }
    window.setTimeout(consultar, 2000);
  }
  window.setTimeout(consultar, 2000);

  // -------------------------------------------------------------------
  // Suma de plazas al marcar mesas (aceptar grupos, sin reserva, unir).
  // -------------------------------------------------------------------
  document.querySelectorAll('form[data-suma-plazas]').forEach((form) => {
    const texto = form.querySelector('[data-suma-texto]');
    const base = Number(form.dataset.base || 0);
    const necesarias = Number(form.dataset.necesarias || 0);
    const inicial = texto ? texto.textContent : '';
    const actualizar = () => {
      const marcadas = [...form.querySelectorAll('input[data-plazas]:checked')];
      if (!texto) return;
      if (!marcadas.length) {
        texto.textContent = inicial;
        return;
      }
      const plazas = base + marcadas.reduce((s, b) => s + Number(b.dataset.plazas), 0);
      const faltan = necesarias - plazas;
      texto.textContent = `${marcadas.length} ${marcadas.length === 1 ? 'mesa' : 'mesas'}: ${plazas} plazas para ${necesarias} `
        + `${necesarias === 1 ? 'persona' : 'personas'}${faltan > 0 ? ` · faltan ${faltan}` : ''}.`;
      texto.classList.toggle('text-danger', faltan > 0);
      texto.classList.toggle('text-success', faltan <= 0);
    };
    form.addEventListener('change', actualizar);
  });

  // -------------------------------------------------------------------
  // Bloqueos: «Todo el día» y «Todas las mesas».
  // -------------------------------------------------------------------
  document.querySelectorAll('form[data-bloqueo]').forEach((form) => {
    const todoDia = form.querySelector('[data-todo-dia]');
    const todas = form.querySelector('[data-todas-mesas]');
    const sync = () => {
      form.querySelectorAll('[data-hora-bloqueo]').forEach((i) => { i.disabled = todoDia.checked; });
      form.querySelectorAll('[data-lista-mesas] input').forEach((i) => { i.disabled = todas.checked; });
    };
    todoDia.addEventListener('change', sync);
    todas.addEventListener('change', sync);
    sync();
  });

  // Ticket: imprimir.
  document.querySelectorAll('[data-imprimir]').forEach((b) => b.addEventListener('click', () => window.print()));

  // Confirmaciones al desmarcar «Activa» o marcar «Solo unir» en una mesa.
  document.querySelectorAll('[data-confirmar-al-desmarcar], [data-confirmar-al-marcar]').forEach((caja) => {
    const formulario = caja.form;
    if (!formulario) return;
    formulario.addEventListener('submit', (ev) => {
      const aviso = (caja.dataset.confirmarAlDesmarcar && !caja.checked && caja.dataset.confirmarAlDesmarcar)
        || (caja.dataset.confirmarAlMarcar && caja.checked && caja.dataset.confirmarAlMarcar);
      if (aviso && !window.confirm(aviso)) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    }, true);
  });

  // -------------------------------------------------------------------
  // Editor del plano: arrastrar las mesas (o moverlas con las flechas) y
  // cambiar su forma. Cada cambio se copia a los campos numéricos del
  // formulario, que es lo que se envía al pulsar «Guardar plano».
  // -------------------------------------------------------------------
  document.querySelectorAll('form[data-editor-plano]').forEach((form) => {
    const svg = form.querySelector('.plano-sala svg');
    const estadoPlano = form.querySelector('[data-estado-plano]');
    const botonForma = form.querySelector('[data-cambiar-forma]');
    let elegida = null;
    const fila = (id) => form.querySelector(`[data-mesa-plano="${id}"]`);
    const campoDe = (id, c) => fila(id).querySelector(`[data-campo="${c}"]`);
    const limitar = (v, min, max) => Math.max(min, Math.min(max, v));
    const redondear = (v) => Math.round(v / 10) * 10;
    const cambiado = () => { estadoPlano.textContent = 'Cambios sin guardar.'; sucio = true; };

    const mover = (g, x, y) => {
      const nx = limitar(redondear(x), 40, 960);
      const ny = limitar(redondear(y), 40, 560);
      g.setAttribute('transform', `translate(${nx} ${ny})`);
      campoDe(g.dataset.id, 'x').value = nx;
      campoDe(g.dataset.id, 'y').value = ny;
      cambiado();
    };
    const posicion = (g) => [Number(campoDe(g.dataset.id, 'x').value), Number(campoDe(g.dataset.id, 'y').value)];
    const elegir = (g) => {
      svg.querySelectorAll('.mesa-plano.elegida').forEach((n) => n.classList.remove('elegida'));
      g.classList.add('elegida');
      elegida = g;
      botonForma.disabled = false;
    };
    const aSvg = (e) => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());

    svg.querySelectorAll('.mesa-plano[data-id]').forEach((g) => {
      let desfase = null;
      g.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        elegir(g);
        g.setPointerCapture(e.pointerId);
        g.classList.add('arrastrando');
        const p = aSvg(e);
        const [x, y] = posicion(g);
        desfase = { dx: p.x - x, dy: p.y - y };
        g.focus();
      });
      g.addEventListener('pointermove', (e) => {
        if (!desfase) return;
        const p = aSvg(e);
        mover(g, p.x - desfase.dx, p.y - desfase.dy);
      });
      const soltar = () => { desfase = null; g.classList.remove('arrastrando'); };
      g.addEventListener('pointerup', soltar);
      g.addEventListener('pointercancel', soltar);
      g.addEventListener('focus', () => elegir(g));
      g.addEventListener('keydown', (e) => {
        const paso = e.shiftKey ? 50 : 10;
        const d = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
        if (!d) return;
        e.preventDefault();
        const [x, y] = posicion(g);
        mover(g, x + d[0], y + d[1]);
      });
    });

    botonForma.addEventListener('click', () => {
      if (!elegida) return;
      const forma = elegida.dataset.forma === 'round' ? 'rect' : 'round';
      elegida.dataset.forma = forma;
      campoDe(elegida.dataset.id, 'forma').value = forma;
      cambiado();
      elegida.focus();
    });

    // Los campos numéricos también mueven la mesa en el dibujo.
    form.querySelectorAll('[data-mesa-plano]').forEach((tr) => {
      tr.addEventListener('change', () => {
        const g = svg.querySelector(`.mesa-plano[data-id="${tr.dataset.mesaPlano}"]`);
        const [x, y] = posicion(g);
        g.setAttribute('transform', `translate(${x} ${y})`);
        g.dataset.forma = campoDe(tr.dataset.mesaPlano, 'forma').value;
      });
    });
  });

  // -------------------------------------------------------------------
  // Lector de QR con la cámara (jsQR, o BarcodeDetector si el navegador lo tiene).
  // Al leer un QR se escribe en el campo y se envía el formulario.
  // -------------------------------------------------------------------
  const lector = document.querySelector('[data-lector]');
  if (!lector) return;
  const video = lector.querySelector('video');
  const estado = document.querySelector('[data-lector-estado]');
  const activar = document.querySelector('[data-lector-activar]');
  const form = document.querySelector('[data-lector-form]');
  const campo = form.querySelector('input[name="qr"]');
  const lienzo = document.createElement('canvas');
  let detector = null;

  const guardar = (k, v) => { try { window.sessionStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  const leer = (k) => { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } };

  async function encender() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      estado.textContent = 'Este navegador no permite usar la cámara (hace falta HTTPS). Usa el campo de texto o la agenda.';
      return;
    }
    let flujo;
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    } catch (e) {
      estado.textContent = 'No se ha podido abrir la cámara. Revisa el permiso del navegador.';
      return;
    }
    video.srcObject = flujo;
    await video.play().catch(() => null);
    if ('BarcodeDetector' in window) {
      try {
        const formatos = await window.BarcodeDetector.getSupportedFormats();
        if (formatos.includes('qr_code')) detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) { detector = null; }
    }
    guardar('ml-camara', '1');
    activar.hidden = true;
    estado.textContent = 'Apunta la cámara al QR de la reserva.';
    window.setInterval(escanear, 250);
  }

  let enviando = false;
  async function escanear() {
    if (enviando || video.readyState < 2) return;
    let texto = null;
    if (detector) {
      try {
        const codigos = await detector.detect(video);
        if (codigos.length) texto = codigos[0].rawValue;
      } catch (e) { detector = null; }
    } else if (typeof window.jsQR === 'function') {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      const escala = Math.min(1, 640 / w);
      lienzo.width = Math.round(w * escala);
      lienzo.height = Math.round(h * escala);
      const ctx = lienzo.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
      const img = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
      const codigo = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      if (codigo) texto = codigo.data;
    }
    if (!texto) return;
    // El mismo QR delante de la cámara no se envía una y otra vez.
    const ultimo = leer('ml-ultimo-qr');
    const cuando = Number(leer('ml-ultimo-qr-t') || 0);
    if (texto === ultimo && Date.now() - cuando < 20000) return;
    guardar('ml-ultimo-qr', texto);
    guardar('ml-ultimo-qr-t', String(Date.now()));
    enviando = true;
    estado.textContent = 'Comprobando…';
    campo.value = texto;
    form.requestSubmit();
  }

  activar.addEventListener('click', encender);
  if (leer('ml-camara') === '1') encender();
})();
