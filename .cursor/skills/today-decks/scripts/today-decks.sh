#!/usr/bin/env bash
# Decks created today (Europe/Moscow) on prod pokazo Postgres.
# Prints the deck view URL: https://pokazo.ru/view/{id}
set -euo pipefail

HOST="${POKAZO_DECKS_HOST:-root@80.87.196.33}"
EXCEPT=""
if [[ "${1:-}" == "--except-me" ]]; then
  EXCEPT="AND u.email NOT IN ('butov6101@mail.ru', 'mail@antonbutov.com')"
elif [[ -n "${1:-}" ]]; then
  echo "usage: today-decks.sh [--except-me]" >&2
  exit 2
fi

ssh -o ConnectTimeout=10 "$HOST" "docker exec -i pokazo-postgres-1 psql -U pokazo -d pokazo" <<SQL
SELECT u.email,
       to_char(d.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow', 'HH24:MI') AS msk,
       d.status,
       d.topic,
       CASE
         WHEN d.status IN ('ready', 'preview')
         THEN 'https://pokazo.ru/view/' || d.id
         ELSE ''
       END AS view
FROM deck d
JOIN "user" u ON u.id = d.user_id
WHERE d.created_at >= (
  (date_trunc('day', now() AT TIME ZONE 'Europe/Moscow') AT TIME ZONE 'Europe/Moscow') AT TIME ZONE 'UTC'
)
${EXCEPT}
ORDER BY d.created_at;
SQL
