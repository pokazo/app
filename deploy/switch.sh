#!/bin/sh
set -eu
# Blue-green: two containers on :19080 / :19081. Nginx stays up.
# Never stop the live slot until reload succeeded and HTTPS health passes.
# Usage: switch.sh <web|api> <image:tag>
KIND=${1:?kind}
IMAGE=${2:?image}
STATE=/etc/pokazo/active-slot
mkdir -p /etc/pokazo /etc/nginx/conf.d
ACTIVE=$(cat "$STATE" 2>/dev/null || echo a)
if [ "$ACTIVE" != a ] && [ "$ACTIVE" != b ]; then ACTIVE=a; fi
if [ "$ACTIVE" = a ]; then IDLE=b; else IDLE=a; fi

PORT_A=19080
PORT_B=19081
if [ "$KIND" = web ]; then
  NAME=pokazo-web
  INNER=80
  CHECK_PATH=/
  PUBLIC_HOST=pokazo.ru
else
  NAME=pokazo-api
  INNER=3000
  CHECK_PATH=/api/health
  PUBLIC_HOST=api.pokazo.ru
fi
if [ "$IDLE" = a ]; then PORT_NEW=$PORT_A; else PORT_NEW=$PORT_B; fi
if [ "$ACTIVE" = a ]; then PORT_OLD=$PORT_A; else PORT_OLD=$PORT_B; fi

write_upstream() {
  primary=$1
  backup=${2:-}
  if [ -n "$backup" ]; then
    cat > /etc/nginx/conf.d/pokazo-upstream.conf <<EOF
upstream pokazo_app {
  server 127.0.0.1:${primary};
  server 127.0.0.1:${backup} backup;
}
EOF
  else
    cat > /etc/nginx/conf.d/pokazo-upstream.conf <<EOF
upstream pokazo_app {
  server 127.0.0.1:${primary};
}
EOF
  fi
}

reload_nginx() {
  nginx -t
  nginx -s reload
}

# Direct to slot (loopback bind).
wait_port() {
  url=$1
  i=0
  while [ "$i" -lt 30 ]; do
    if curl -fsS --max-time 3 "$url" >/dev/null 2>&1; then return 0; fi
    i=$((i + 1))
    sleep 2
  done
  return 1
}

# Through host nginx :443 after reload — this is what users hit.
wait_public() {
  i=0
  while [ "$i" -lt 15 ]; do
    if curl -fsSk --max-time 3 --resolve "${PUBLIC_HOST}:443:127.0.0.1" \
      "https://${PUBLIC_HOST}${CHECK_PATH}" >/dev/null 2>&1; then
      return 0
    fi
    i=$((i + 1))
    sleep 1
  done
  return 1
}

rollback_nginx() {
  write_upstream "$PORT_OLD"
  reload_nginx || true
}

echo "active=$ACTIVE idle=$IDLE new=:$PORT_NEW old=:$PORT_OLD image=$IMAGE"

# Free disk before pull: stop idle first so its image is unused, then prune.
# API images embed Playwright Chromium; extract fails with ENOSPC otherwise.
docker stop "$NAME-$IDLE" 2>/dev/null || true
docker rm "$NAME-$IDLE" 2>/dev/null || true
docker container prune -f >/dev/null 2>&1 || true
docker image prune -af >/dev/null 2>&1 || true
docker builder prune -af >/dev/null 2>&1 || true
docker system prune -af >/dev/null 2>&1 || true
df -h / /var/lib/docker 2>/dev/null | head -20 || df -h / | head -5 || true

docker pull "$IMAGE"

if [ "$KIND" = web ]; then
  docker run -d --name "$NAME-$IDLE" --restart unless-stopped \
    -p "127.0.0.1:$PORT_NEW:$INNER" "$IMAGE"
else
  mkdir -p /var/lib/pokazo/decks /var/lib/pokazo/uploads
  docker run -d --name "$NAME-$IDLE" --restart unless-stopped --env-file /etc/pokazo/api.env \
    --add-host=host.docker.internal:host-gateway \
    --network pokazo_default \
    -v /var/lib/pokazo/decks:/app/data/decks \
    -v /var/lib/pokazo/uploads:/app/data/uploads \
    -p "127.0.0.1:$PORT_NEW:$INNER" "$IMAGE"
fi

if ! wait_port "http://127.0.0.1:${PORT_NEW}${CHECK_PATH}"; then
  echo "idle health failed, keeping $ACTIVE"
  docker stop "$NAME-$IDLE" 2>/dev/null || true
  exit 1
fi

HAS_OLD=0
if docker inspect -f '{{.State.Running}}' "$NAME-$ACTIVE" 2>/dev/null | grep -q true; then
  HAS_OLD=1
fi

if [ "$HAS_OLD" = 1 ]; then
  write_upstream "$PORT_NEW" "$PORT_OLD"
else
  write_upstream "$PORT_NEW"
fi
reload_nginx

if ! wait_public; then
  echo "nginx health after switch failed, rolling back to $ACTIVE"
  if [ "$HAS_OLD" = 1 ]; then
    rollback_nginx
  fi
  docker stop "$NAME-$IDLE" 2>/dev/null || true
  exit 1
fi

write_upstream "$PORT_NEW"
reload_nginx
if ! wait_public; then
  echo "nginx health after drain-config failed, rolling back to $ACTIVE"
  if [ "$HAS_OLD" = 1 ]; then
    rollback_nginx
  fi
  exit 1
fi

echo "$IDLE" > "$STATE"
# Drain in-flight on the old slot; nginx already points only at new.
if [ "$HAS_OLD" = 1 ]; then
  sleep 20
  docker stop "$NAME-$ACTIVE" 2>/dev/null || true
fi
echo "switched to $IDLE (:$PORT_NEW) without stopping nginx"
