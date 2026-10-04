#!/bin/sh
set -eu
# Usage: switch.sh <web|api> <image:tag>
KIND=${1:?kind}
IMAGE=${2:?image}
STATE=/etc/pokazo/active-slot
mkdir -p /etc/pokazo
ACTIVE=$(cat "$STATE" 2>/dev/null || echo a)
if [ "$ACTIVE" = a ]; then IDLE=b; else IDLE=a; fi
if [ "$KIND" = web ]; then
  PORT_A=19080
  PORT_B=19081
  NAME=pokazo-web
else
  PORT_A=19080
  PORT_B=19081
  NAME=pokazo-api
fi
if [ "$IDLE" = a ]; then PORT=$PORT_A; else PORT=$PORT_B; fi

docker pull "$IMAGE"
docker stop "$NAME-$IDLE" 2>/dev/null || true
docker rm "$NAME-$IDLE" 2>/dev/null || true
if [ "$KIND" = web ]; then
  docker run -d --name "$NAME-$IDLE" --restart unless-stopped -p "127.0.0.1:$PORT:80" "$IMAGE"
  CHECK="http://127.0.0.1:$PORT/"
else
  docker run -d --name "$NAME-$IDLE" --restart unless-stopped --env-file /etc/pokazo/api.env \
    --add-host=host.docker.internal:host-gateway \
    --network pokazo_default \
    -v /var/lib/pokazo/decks:/app/data/decks -p "127.0.0.1:$PORT:3000" "$IMAGE"
  CHECK="http://127.0.0.1:$PORT/api/health"
fi

ok=0
i=0
while [ $i -lt 30 ]; do
  if curl -fsS "$CHECK" >/dev/null 2>&1; then ok=1; break; fi
  i=$((i+1))
  sleep 2
done
if [ "$ok" != 1 ]; then
  echo "health failed, keeping $ACTIVE"
  exit 1
fi

cat > /etc/nginx/conf.d/pokazo-upstream.conf <<EOF
upstream pokazo_app { server 127.0.0.1:$PORT; }
EOF
nginx -s reload
echo "$IDLE" > "$STATE"
sleep 5
docker stop "$NAME-$ACTIVE" 2>/dev/null || true
echo "switched to $IDLE"
