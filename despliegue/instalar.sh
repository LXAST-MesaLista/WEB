#!/usr/bin/env bash
# MesaLista · instalación o actualización de la web en la misma máquina que el
# servidor de MesaLista (Ubuntu Server 24.04, API en Node.js ya instalada como
# mesalista-api.service por el proyecto LXPT-UIB/Servidor).
#
# Desde la copia del proyecto en la máquina (puede estar en la carpeta personal):
#   sudo bash despliegue/instalar.sh
#   sudo bash despliegue/instalar.sh --dominio <dominio>   (solo si el servidor no lo guardó)
#   sudo bash despliegue/instalar.sh --no-interactivo      sin preguntas (Ansible)
#
# Se puede ejecutar tantas veces como haga falta: actualiza el código y
# conserva config/config.json y las sesiones abiertas.
#
# Queda así en el servidor:
#   /opt/mesalista-web                      la web (src/, vistas/, publico/, node_modules/)
#   /opt/mesalista-web/config/config.json   dirección de la API, puerto y sesiones
#   mesalista-web.service                   el proceso de Node.js, en 127.0.0.1:8092
#   /var/lib/mesalista-web/sesiones         sesiones de la web
#   nginx                                   HTTPS en https://<dominio>/: sirve /assets,
#                                           reenvía /api/v1 a la API y el resto a la web

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR=/opt/mesalista-web
CONFIG=$APP_DIR/config/config.json
APP_USER=mesalista-web
ETC_DIR=/etc/mesalista
ENV_FILE=$ETC_DIR/install.env
ACME_DIR=/var/www/letsencrypt
SITE=/etc/nginx/sites-available/mesalista
WEB_PORT=8092
API_PORT=8091
NODE_MAJOR=24

NUEVO_DOMINIO=""
NO_INTERACTIVO=${ML_NO_INTERACTIVO:-0}
while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-interactivo) NO_INTERACTIVO=1 ;;
        --dominio)   NUEVO_DOMINIO=${2:-}; shift ;;
        --dominio=*) NUEVO_DOMINIO=${1#*=} ;;
        -h|--help)   sed -n '2,20p' "$0"; exit 0 ;;
        *)           echo "Opción desconocida: $1 (usa --help)" >&2; exit 1 ;;
    esac
    shift
done

say()  { printf '\n\033[1;33m== %s\033[0m\n' "$*"; }
warn() { printf '\033[1;31m!! %s\033[0m\n' "$*" >&2; }
normalizar_dominio() {
    printf '%s' "$1" | tr 'A-Z' 'a-z' | sed -e 's#^https\?://##' -e 's#/.*$##' -e 's#:.*$##'
}
leer_env() {  # leer_env CLAVE: valor guardado por el servidor en install.env
    [[ -f "$ENV_FILE" ]] && sed -n "s/^$1=//p" "$ENV_FILE" | head -n 1 || true
}

[[ $EUID -eq 0 ]] || { warn "Ejecuta el script con sudo."; exit 1; }
[[ -f "$REPO_DIR/src/servidor.js" && -d "$REPO_DIR/vistas" && -d "$REPO_DIR/publico" ]] \
    || { warn "No encuentro src/, vistas/ y publico/ en $REPO_DIR."; exit 1; }
# shellcheck source=/dev/null
source /etc/os-release
[[ "$ID" == "ubuntu" && "$VERSION_ID" == "24.04" ]] \
    || warn "Pensado para Ubuntu Server 24.04 LTS; detectado $PRETTY_NAME."

# ---------------------------------------------------------------------------
# Dominio: la web y la API comparten el sitio, así que es siempre el del
# servidor (lo guarda su install.sh en install.env).
# ---------------------------------------------------------------------------
say "Comprobaciones"
SERVER_DOMAIN=$(leer_env SERVER_DOMAIN)
LE_EMAIL=$(leer_env LE_EMAIL)
NUEVO_DOMINIO=$(normalizar_dominio "$NUEVO_DOMINIO")
if [[ -n "$SERVER_DOMAIN" ]]; then
    if [[ -n "$NUEVO_DOMINIO" && "$NUEVO_DOMINIO" != "$SERVER_DOMAIN" ]]; then
        warn "El servidor está instalado con $SERVER_DOMAIN. La web usa el mismo dominio:"
        warn "cámbialo antes en el servidor (sudo bash despliegue/install.sh --dominio $NUEVO_DOMINIO)"
        warn "y vuelve a ejecutar este script sin --dominio."
        exit 1
    fi
    DOMAIN=$SERVER_DOMAIN
elif [[ -n "$NUEVO_DOMINIO" ]]; then
    DOMAIN=$NUEVO_DOMINIO
elif [[ $NO_INTERACTIVO -eq 1 ]]; then
    warn "Falta el dominio: instala antes el servidor (guarda install.env) o usa --dominio."
    exit 1
else
    read -rp "Dominio del servidor (p. ej. mesalista.spaincentral.cloudapp.azure.com): " DOMAIN
    DOMAIN=$(normalizar_dominio "$DOMAIN")
fi
[[ "$DOMAIN" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] \
    || { warn "«$DOMAIN» no es un dominio válido."; exit 1; }
echo "Dominio: $DOMAIN"

# ---------------------------------------------------------------------------
# Paquetes: nginx, certbot y Node.js (el mismo que usa la API)
# ---------------------------------------------------------------------------
say "Paquetes"
# Si Apache (instalación anterior) ocupa los puertos 80 y 443, el paquete de
# nginx no puede arrancar al instalarse y apt falla: se apaga antes.
if systemctl is-enabled --quiet apache2 2>/dev/null || systemctl is-active --quiet apache2 2>/dev/null; then
    warn "Apache estaba activo: se detiene y se desactiva; nginx atiende ahora el dominio."
    systemctl disable --now apache2 >/dev/null 2>&1 || true
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot rsync curl openssl ca-certificates gnupg >/dev/null
if ! command -v node >/dev/null || (( $(node -p 'process.versions.node.split(".")[0]') < 20 )); then
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list
    apt-get update -qq
    apt-get install -y -qq nodejs >/dev/null
fi
NODE_BIN=$(command -v node)
echo "Node.js $(node --version) · $(nginx -v 2>&1)"

# La web habla con la API por dentro (127.0.0.1:8091), sin pasar por nginx.
if ! curl -fs -o /dev/null --max-time 10 -H 'X-Forwarded-Proto: https' "http://127.0.0.1:${API_PORT}/api/v1/config"; then
    warn "La API no responde en http://127.0.0.1:${API_PORT}/api/v1/ (mesalista-api.service)."
    warn "La web se instala igualmente; revisa el servidor: systemctl status mesalista-api"
fi

# ---------------------------------------------------------------------------
# Código y dependencias. --delete quita los archivos de versiones anteriores
# que ya no existen; config.json y node_modules se conservan.
# ---------------------------------------------------------------------------
say "Código en $APP_DIR"
id -u "$APP_USER" >/dev/null 2>&1 \
    || useradd --system --home-dir "$APP_DIR" --no-create-home --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR/config"
rsync -a --delete \
    --exclude '/.git' --exclude '/node_modules' --exclude '/config/config.json' --exclude '/sesiones' \
    "$REPO_DIR/" "$APP_DIR/"
(cd "$APP_DIR" && npm ci --omit=dev --no-audit --no-fund --loglevel=error)

# Crea config.json la primera vez; si ya existe, solo corrige el puerto de la API.
node "$APP_DIR/bin/escribir-config.js" "$CONFIG" "$API_PORT"

# El código es de root y solo se lee: el servicio no puede cambiarlo. nginx
# (www-data) lee publico/ para servir /assets.
chown -R root:root "$APP_DIR"
find "$APP_DIR" -type d -exec chmod 755 {} +
find "$APP_DIR" -type f -exec chmod 644 {} +
chown root:"$APP_USER" "$CONFIG"
chmod 640 "$CONFIG"

# ---------------------------------------------------------------------------
# Servicio de systemd
# ---------------------------------------------------------------------------
say "Servicio mesalista-web"
sed -e "s#__APP_DIR__#${APP_DIR}#g" -e "s#__NODE__#${NODE_BIN}#g" \
    "$REPO_DIR/despliegue/mesalista-web.service" > /etc/systemd/system/mesalista-web.service
systemctl daemon-reload
systemctl enable mesalista-web >/dev/null
systemctl restart mesalista-web

# ---------------------------------------------------------------------------
# nginx en los puertos 80 y 443 (Apache ya se ha apagado en «Paquetes»):
# HTTPS, /api/v1 → API, el resto → la web y el desafío de Let's Encrypt.
# Mientras no hay certificado de Let's Encrypt arranca con uno autofirmado.
# ---------------------------------------------------------------------------
say "nginx"

LE_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
LE_KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
SELF_CERT="$ETC_DIR/selfsigned-$DOMAIN.crt"
SELF_KEY="$ETC_DIR/selfsigned-$DOMAIN.key"
CERT_OK=0
[[ -f "$LE_CERT" ]] && CERT_OK=1   # ya existe; certbot lo renueva solo
mkdir -p "$ETC_DIR" "$ACME_DIR/.well-known/acme-challenge"
if [[ $CERT_OK -eq 0 && ! -f "$SELF_CERT" ]]; then
    openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj "/CN=$DOMAIN" \
        -addext "subjectAltName=DNS:$DOMAIN" -keyout "$SELF_KEY" -out "$SELF_CERT" 2>/dev/null
    chmod 600 "$SELF_KEY"
fi

render_site() {  # render_site CERT KEY
    sed -e "s#__DOMAIN__#${DOMAIN}#g" -e "s#__APP_DIR__#${APP_DIR}#g" -e "s#__ACME_DIR__#${ACME_DIR}#g" \
        -e "s#__WEB_PORT__#${WEB_PORT}#g" -e "s#__API_PORT__#${API_PORT}#g" \
        -e "s#__CERT__#$1#g" -e "s#__KEY__#$2#g" \
        "$REPO_DIR/despliegue/nginx-mesalista.conf" > "$SITE"
}
if [[ $CERT_OK -eq 1 ]]; then render_site "$LE_CERT" "$LE_KEY"; else render_site "$SELF_CERT" "$SELF_KEY"; fi
ln -sf "$SITE" /etc/nginx/sites-enabled/mesalista
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx >/dev/null
systemctl restart nginx

# Cortafuegos: si ufw está activo, se abren 80 y 443 (el servidor ya los abre).
if ufw status 2>/dev/null | grep -q '^Status: active'; then
    ufw allow 80/tcp >/dev/null
    ufw allow 443/tcp >/dev/null
fi

# ---------------------------------------------------------------------------
# Certificado HTTPS de Let's Encrypt (desafío HTTP por el puerto 80). La
# renovación automática recarga nginx.
# ---------------------------------------------------------------------------
if [[ $CERT_OK -eq 0 ]]; then
    say "Certificado para $DOMAIN"
    if [[ -z "$LE_EMAIL" && $NO_INTERACTIVO -eq 1 ]]; then
        warn "Falta LE_EMAIL: instala antes el servidor (lo guarda en install.env)."; exit 1
    fi
    [[ -n "$LE_EMAIL" ]] || read -rp "Correo para Let's Encrypt (avisos de caducidad): " LE_EMAIL
    if certbot certonly --webroot -w "$ACME_DIR" -d "$DOMAIN" -m "$LE_EMAIL" \
            --agree-tos --non-interactive --keep-until-expiring; then
        CERT_OK=1
        render_site "$LE_CERT" "$LE_KEY"
        nginx -t
        systemctl reload nginx
    fi
fi
if [[ $CERT_OK -eq 1 ]]; then
    mkdir -p /etc/letsencrypt/renewal-hooks/deploy
    printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/mesalista-reload.sh
    chmod 755 /etc/letsencrypt/renewal-hooks/deploy/mesalista-reload.sh
else
    warn "No se ha podido obtener el certificado de Let's Encrypt para $DOMAIN."
    warn "Se usa uno autofirmado temporal (el navegador mostrará un aviso)."
    warn "Comprueba que $DOMAIN apunta a la IP pública y que el puerto 80 está abierto"
    warn "(en Azure: Redes > reglas de entrada), y vuelve a ejecutar instalar.sh."
fi

# ---------------------------------------------------------------------------
# Comprobación: la portada responde por nginx y llega a la API (muestra el buscador)
# ---------------------------------------------------------------------------
say "Comprobación"
CURL_OPTS=(-s --max-time 15 --resolve "$DOMAIN:443:127.0.0.1")
[[ $CERT_OK -eq 1 ]] || CURL_OPTS+=(-k)   # solo para ver la portada desde aquí
sleep 1
PORTADA=$(curl "${CURL_OPTS[@]}" "https://$DOMAIN/" || true)
if grep -q 'Ver horas libres' <<<"$PORTADA"; then
    echo "La web responde en https://$DOMAIN/ y se comunica con la API."
elif grep -q 'No se puede conectar con el servidor de reservas' <<<"$PORTADA"; then
    warn "La web responde, pero no llega a la API (http://127.0.0.1:${API_PORT}/api/v1)."
    warn "Revisa: systemctl status mesalista-api · journalctl -u mesalista-web"
else
    warn "La portada no responde como se esperaba."
    warn "Revisa: journalctl -u mesalista-web · /var/log/nginx/mesalista-error.log"
fi
if ! curl "${CURL_OPTS[@]}" -o /dev/null -f "https://$DOMAIN/api/v1/config"; then
    warn "https://$DOMAIN/api/v1/ no responde a través de nginx (la app Android la usa)."
fi

say "Listo"
cat <<EOF
  Web:             https://${DOMAIN}/
  Panel:           https://${DOMAIN}/panel/entrar
  API:             https://${DOMAIN}/api/v1/
  Configuración:   ${CONFIG}
  Registros:       journalctl -u mesalista-web · /var/log/nginx/mesalista-*.log
  Para actualizar: git pull en la copia del proyecto y vuelve a ejecutar este script.
EOF
