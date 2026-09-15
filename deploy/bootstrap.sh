#!/usr/bin/env bash
# Разовая подготовка сервера для «Я тебя жду». Запускается под root:
#
#   ssh root@168.222.142.117 "DEPLOY_PUBKEY='ssh-ed25519 AAAA...' bash -s" < deploy/bootstrap.sh
#
# Только добавляет новое рядом с Формой: пароли, sshd, файрвол, пакеты,
# демон Docker и всё в /opt/forma не трогаются. Повторный запуск безопасен —
# существующее не перезаписывается. Секреты генерируются здесь же, на
# сервере, и никуда не уходят.
set -euo pipefail

: "${DEPLOY_PUBKEY:?Нужен DEPLOY_PUBKEY — публичный ключ для GitHub Actions}"

say() { printf '\n==> %s\n' "$*"; }

command -v python3 >/dev/null || { echo "!!! нужен python3 для генерации VAPID-ключей" >&2; exit 1; }

say "Форма до изменений"
docker ps --format '{{.Names}}\t{{.Status}}' | grep forma || true
before=$(curl -s -o /dev/null -w '%{http_code}' https://forma-one.ru || echo 000)
echo "forma-one.ru: $before"

say "Память и диск"
free -m | awk 'NR==2 {print "доступно МБ:", $7}'
df -h / | awk 'NR==2 {print "свободно на диске:", $4}'
avail=$(free -m | awk 'NR==2 {print $7}')
if [ "$avail" -lt 800 ]; then
    echo "!!! свободной памяти меньше 800 МБ — остановка, ничего не изменено" >&2
    exit 1
fi

say "Снимок Формы"
backup=/root/forma-backup-$(date +%F)
if [ ! -d "$backup" ]; then
    mkdir -p "$backup"
    docker exec forma-postgres-1 sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$backup/forma.dump"
    cp /opt/forma/.env.prod "$backup/"
    cp -r /opt/forma/certs "$backup/"
    chmod -R go-rwx "$backup"
fi
ls -la "$backup"

say "Пользователь waitproof"
id waitproof >/dev/null 2>&1 || useradd --create-home --shell /bin/bash waitproof
usermod -aG docker waitproof
install -d -m 700 -o waitproof -g waitproof /home/waitproof/.ssh
grep -qxF "$DEPLOY_PUBKEY" /home/waitproof/.ssh/authorized_keys 2>/dev/null \
    || echo "$DEPLOY_PUBKEY" >> /home/waitproof/.ssh/authorized_keys
chown waitproof:waitproof /home/waitproof/.ssh/authorized_keys
chmod 600 /home/waitproof/.ssh/authorized_keys

say "Сеть edge (до правки Формы, иначе её compose не найдёт сеть)"
docker network inspect edge >/dev/null 2>&1 || docker network create edge

say "Каталоги"
[ -d /opt/wait-proof/.git ] || git clone -q https://github.com/eugenepokalyuk/wait-proof.git /opt/wait-proof
chown -R waitproof:waitproof /opt/wait-proof
install -d -m 750 -o root -g waitproof /etc/wait-proof
install -d /opt/edge/certbot-www /opt/edge/letsencrypt /opt/edge/certs/wait-proof
install -d -m 700 /var/backups/wait-proof

say "Временный сертификат (nginx Формы должен найти файл при любом старте)"
if [ ! -f /opt/edge/certs/wait-proof/fullchain.pem ]; then
    openssl req -x509 -nodes -newkey rsa:2048 -days 30 -subj '/CN=168-222-142-117.sslip.io' \
        -keyout /opt/edge/certs/wait-proof/privkey.pem \
        -out /opt/edge/certs/wait-proof/fullchain.pem 2>/dev/null
fi
ls -la /opt/edge/certs/wait-proof

say "Окружение /etc/wait-proof/api.env"
if [ -f /etc/wait-proof/api.env ]; then
    echo "уже есть — не перезаписываю"
else
    # Разбираем текстовый вывод openssl, а не DER по смещениям: раскладка
    # DER зависит от версии OpenSSL, текст — нет
    keys=$(openssl ecparam -name prime256v1 -genkey -noout 2>/dev/null | openssl ec -text -noout 2>/dev/null | python3 -c '
import base64, re, sys
text = sys.stdin.read()
def block(name):
    m = re.search(name + r":\s*((?:[0-9a-f]{2}:?\s*)+)", text)
    return bytes.fromhex(re.sub(r"[^0-9a-f]", "", m.group(1)))
b64 = lambda raw: base64.urlsafe_b64encode(raw).rstrip(b"=").decode()
priv = block("priv").rjust(32, b"\0")[-32:]
pub = block("pub")
assert len(pub) == 65 and pub[0] == 4
print(b64(pub), b64(priv))
')
    vapid_public=${keys% *}
    vapid_private=${keys#* }
    db_password=$(openssl rand -hex 24)
    umask 027
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
DB_PASSWORD=$db_password
POSTGRES_PASSWORD=$db_password
VAPID_PUBLIC_KEY=$vapid_public
VAPID_PRIVATE_KEY=$vapid_private
VAPID_SUBJECT=https://eugenepokalyuk.github.io/wait-proof/
ENV
fi
chown root:waitproof /etc/wait-proof/api.env
chmod 640 /etc/wait-proof/api.env
grep -c = /etc/wait-proof/api.env | xargs echo "переменных:"

say "crontab: ежедневный reload nginx Формы для продлённого сертификата"
line='17 4 * * * docker exec forma-nginx-1 nginx -s reload >/dev/null 2>&1'
if command -v crontab >/dev/null; then
    { crontab -u waitproof -l 2>/dev/null | grep -vxF "$line" || true; echo "$line"; } | crontab -u waitproof -
else
    echo "!!! cron не установлен — продлённый сертификат nginx подхватит только при деплое Формы"
fi

say "Форма после изменений"
docker ps --format '{{.Names}}\t{{.Status}}' | grep forma || true
after=$(curl -s -o /dev/null -w '%{http_code}' https://forma-one.ru || echo 000)
echo "forma-one.ru: $after (было $before)"
echo
echo "Готово. Отпечаток ключа хоста для DEPLOY_KNOWN_HOSTS:"
ssh-keyscan -t ed25519 localhost 2>/dev/null | sed 's/^localhost/168.222.142.117/'
