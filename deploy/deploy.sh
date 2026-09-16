#!/usr/bin/env bash
# Выкатка бэкенда на сервере. Запускается из GitHub Actions: скрипт приходит
# по stdin (ssh ... 'bash -s' < deploy/deploy.sh), поэтому git reset ниже
# не перезаписывает его на ходу.
#
# Трогает только проект wait-proof. Контейнеры, образы и сети Формы — никогда.
set -euo pipefail

APP_DIR=/opt/wait-proof
COMPOSE="docker compose -f deploy/docker-compose.prod.yml"
export IMAGE_TAG="${IMAGE_TAG:-latest}"

cd "$APP_DIR"

echo "==> код (только конфиги деплоя, приложение живёт в образе)"
git fetch --prune origin main
git reset --hard origin/main

echo "==> образ $IMAGE_TAG"
# Пакет в GHCR приватный. Токен одноразовый — GITHUB_TOKEN живёт, пока идёт
# job, — поэтому сразу после скачивания выходим, чтобы он не лежал на диске
if [ -n "${GHCR_TOKEN:-}" ]; then
    echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
fi
$COMPOSE pull api tick
docker logout ghcr.io >/dev/null 2>&1 || true

echo "==> база"
# --wait: без него первый запуск падал на миграциях — postgres ещё
# инициализировал кластер, а migrate уже стучался в порт
$COMPOSE up -d --wait db
# </dev/null обязательно: скрипт приходит по stdin, а docker compose run
# отдаёт этот же stdin контейнеру — bash не видел остаток файла, и выкатка
# молча заканчивалась после миграций с кодом 0. Одного -T мало
$COMPOSE run --rm -T --no-deps api python manage.py migrate --noinput </dev/null
$COMPOSE run --rm -T --no-deps api python manage.py createcachetable </dev/null

echo "==> перезапуск"
$COMPOSE up -d --remove-orphans

echo "==> чистка старых образов проекта"
# Только наши: фильтр по метке. docker image prune без фильтра снёс бы и
# неиспользуемые образы Формы, которые ей нужны для отката
docker image prune -f --filter label=project=wait-proof >/dev/null

echo "==> ждём здоровья api"
for _ in $(seq 1 30); do
    status=$(docker inspect -f '{{.State.Health.Status}}' wait-proof-api 2>/dev/null || echo missing)
    if [ "$status" = "healthy" ]; then
        echo "==> ОК: wait-proof-api healthy"
        exit 0
    fi
    sleep 2
done

echo "!!! api не поднялся, последние логи:" >&2
$COMPOSE logs --tail 80 api >&2
exit 1
