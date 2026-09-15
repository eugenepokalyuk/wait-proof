# Подготовка сервера

Один раз, руками, под root. Каждый шаг только **добавляет** новое рядом с
Формой: пароли, ssh, файрвол, пакеты и демон Docker не трогаются. Код на
сервер не копируется — сервер клонирует публичный репозиторий.

## 1. Осмотр — ничего не меняя

```bash
docker compose ls
docker ps --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'
free -m
df -h /
docker version --format '{{.Server.Version}}'; docker compose version
```

Нужно свободных ~800 МБ памяти (с учётом кэша) и ~3 ГБ диска. Меньше —
стоп, обсуждаем до любых действий.

## 2. Снимок Формы

```bash
B=/root/forma-backup-$(date +%F); mkdir -p $B
docker exec forma-postgres-1 sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > $B/forma.dump
cp /opt/forma/.env.prod $B/ && cp -r /opt/forma/certs $B/
curl -s -o /dev/null -w '%{http_code}\n' https://forma-one.ru   # 200
```

## 3. Пользователь для деплоя

```bash
useradd --create-home --shell /bin/bash waitproof
usermod -aG docker waitproof          # docker = фактически root, принимаем осознанно
install -d -m 700 -o waitproof -g waitproof /home/waitproof/.ssh
# публичная часть ключа GitHub Actions (приватная — в секрете DEPLOY_SSH_KEY)
echo 'ssh-ed25519 AAAA... github-actions-wait-proof' > /home/waitproof/.ssh/authorized_keys
chown waitproof:waitproof /home/waitproof/.ssh/authorized_keys && chmod 600 /home/waitproof/.ssh/authorized_keys
sshd -T | grep -i pubkeyauthentication   # должно быть yes; sshd не правим
```

## 4. Сеть и каталоги

```bash
docker network create edge
git clone https://github.com/eugenepokalyuk/wait-proof.git /opt/wait-proof
chown -R waitproof:waitproof /opt/wait-proof
install -d -m 750 -o root -g waitproof /etc/wait-proof
install -d /opt/edge/certbot-www /opt/edge/letsencrypt /opt/edge/certs/wait-proof
install -d -m 700 /var/backups/wait-proof
# Временный сертификат: nginx Формы должен найти файл уже при первом старте
openssl req -x509 -nodes -newkey rsa:2048 -days 30 -subj '/CN=168-222-142-117.sslip.io' \
  -keyout /opt/edge/certs/wait-proof/privkey.pem -out /opt/edge/certs/wait-proof/fullchain.pem
```

## 5. Окружение `/etc/wait-proof/api.env`

```bash
cd /opt/wait-proof
KEYS=$(docker run --rm ghcr.io/eugenepokalyuk/wait-proof-api:latest python manage.py vapid_keys 2>/dev/null)
DBPASS=$(openssl rand -hex 24)
cat > /etc/wait-proof/api.env <<ENV
DJANGO_SECRET_KEY=$(openssl rand -hex 32)
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=168-222-142-117.sslip.io,wait-proof-api,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://eugenepokalyuk.github.io
CSRF_TRUSTED_ORIGINS=https://168-222-142-117.sslip.io
SECURE_COOKIES=True
APP_URL=https://eugenepokalyuk.github.io/wait-proof
DB_NAME=waitproof
DB_USER=waitproof
DB_PASSWORD=$DBPASS
POSTGRES_PASSWORD=$DBPASS
$KEYS
VAPID_SUBJECT=https://eugenepokalyuk.github.io/wait-proof/
ENV
chmod 640 /etc/wait-proof/api.env && chown root:waitproof /etc/wait-proof/api.env
```

## 6. Первый запуск нашего проекта

Actions → Deploy API → Run workflow (или вручную под `waitproof`:
`cd /opt/wait-proof && bash deploy/deploy.sh`). Снаружи API пока не виден —
это нормально.

```bash
docker exec -it wait-proof-api python manage.py createsuperuser
```

## 7. Правка Формы

PR в `forma-project` по [forma/PR.md](forma/PR.md), выкатывается пайплайном
Формы. Сразу после:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://forma-one.ru          # 200
curl -sk https://168-222-142-117.sslip.io/api/v1/health                 # {"ok":true}
```

## 8. Настоящий сертификат

```bash
cd /opt/wait-proof
docker compose -f deploy/docker-compose.prod.yml run --rm --entrypoint certbot certbot \
  certonly --webroot -w /var/www/certbot -d 168-222-142-117.sslip.io \
  --agree-tos --register-unsafely-without-email --non-interactive
cp -L /opt/edge/letsencrypt/live/168-222-142-117.sslip.io/{fullchain,privkey}.pem /opt/edge/certs/wait-proof/
docker exec forma-nginx-1 nginx -t && docker exec forma-nginx-1 nginx -s reload
# ежедневный reload — чтобы nginx подхватывал продлённый сертификат
(crontab -u waitproof -l 2>/dev/null; echo '17 4 * * * docker exec forma-nginx-1 nginx -s reload >/dev/null 2>&1') | crontab -u waitproof -
```

## 9. Проверка

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://forma-one.ru
curl -s https://168-222-142-117.sslip.io/api/v1/health
free -m
# Контрольный тест: без нашего API Форма живёт
docker stop wait-proof-api && curl -s -o /dev/null -w '%{http_code}\n' https://forma-one.ru && docker start wait-proof-api
```

Затем в репозитории: переменная `DEPLOY_ENABLED=true`, секреты
`DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_KNOWN_HOSTS`
(`ssh-keyscan 168.222.142.117`).
