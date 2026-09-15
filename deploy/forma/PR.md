# Правка Формы: nginx обслуживает ещё и API «Я тебя жду»

Три изменения в `forma-project`, одним PR:

## 1. `docker-compose.prod.yml` — сервис nginx

```yaml
  nginx:
    # ...как было...
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/certs:ro
      - staticfiles:/staticfiles:ro
      - media:/media:ro
      - /opt/edge/certbot-www:/var/www/certbot:ro
      - /opt/edge/certs/wait-proof:/etc/nginx/wait-proof-certs:ro
    networks:
      - default
      - edge

networks:
  edge:
    external: true
```

У остальных сервисов сети не трогаем: без `networks` они остаются в `default`.

## 2. `nginx/nginx.conf`

В конец файла — содержимое `deploy/forma/wait-proof.conf` из репозитория
wait-proof.

## 3. `.github/workflows/deploy.yml` — проверка конфига первым шагом

Сразу после `git reset --hard FETCH_HEAD` и загрузки `.env.prod`, **до**
пересоздания контейнеров:

```bash
docker compose -f docker-compose.prod.yml run --rm --no-deps nginx nginx -t
```

Если конфиг битый — `set -e` останавливает деплой, работающие контейнеры
Формы не тронуты.

## Предусловия на сервере (иначе nginx Формы не поднимется)

- `docker network ls | grep edge` — сеть есть;
- `/opt/edge/certs/wait-proof/fullchain.pem` и `privkey.pem` — файлы есть;
- `/opt/edge/certbot-www` — каталог есть.

## Откат

Revert этого коммита — пайплайн Формы вернёт прежний nginx.
