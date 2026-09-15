import os
import sys
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


def env_list(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-secret-key-change-in-production")
DEBUG = os.environ.get("DJANGO_DEBUG", "True") == "True"
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

# TLS обрывается на nginx Формы, до нас запрос доходит по http внутри
# docker-сети. Заголовок ставит сам nginx; снаружи до контейнера не
# достучаться — порт не опубликован, поэтому подделать его некому
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

INSTALLED_APPS = [
    # Наследник django.contrib.admin с нужным порядком разделов (common/admin.py)
    "common.apps.WaitProofAdminConfig",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "accounts",
    "friends",
    "timers",
    "push",
    "siteconf",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Сразу за SecurityMiddleware — так велит документация whitenoise:
    # статика отдаётся до сессий и CSRF, которые ей не нужны
    "whitenoise.middleware.WhiteNoiseMiddleware",
    # Выше CommonMiddleware, иначе заголовки не попадут в ответы на редиректах
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Постгрес на сервере, SQLite — чтобы проект поднимался сразу после клона.
# Переключается переменной, а не правкой кода
if os.environ.get("DB_ENGINE", "postgresql").strip().lower() == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME", "waitproof"),
            "USER": os.environ.get("DB_USER", "waitproof"),
            "PASSWORD": os.environ.get("DB_PASSWORD", ""),
            "HOST": os.environ.get("DB_HOST", "localhost"),
            "PORT": os.environ.get("DB_PORT", "5432"),
            # Соединение живёт между запросами: воркер один, а открывать
            # новое на каждый опрос таймера раз в 5 секунд — пустая работа
            "CONN_MAX_AGE": 60,
            "CONN_HEALTH_CHECKS": True,
        }
    }

# Счётчики лимитов DRF лежат в кэше. LocMemCache у каждого процесса свой:
# воркер gunicorn и контейнер tick считали бы попытки входа порознь.
# Redis ради пары счётчиков не заводим — таблица в той же базе
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "cache",
    }
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
        "OPTIONS": {"user_attributes": ("email", "name")},
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
CORS_ALLOW_METHODS = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
# Своё устройство клиент называет этим заголовком, чтобы не получить пуш о
# собственном щелчке. Без него в списке браузер отрежет запрос на preflight
CORS_ALLOW_HEADERS = ["accept", "authorization", "content-type", "x-device-id"]

# Django 4+ сверяет Origin со списком и без схемы в нём отдаёт 403. Отдельно
# от CORS: тот про запросы приложения, этот — про саму админку
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")

SECURE_COOKIES = os.environ.get("SECURE_COOKIES", "False" if DEBUG else "True") == "True"
SESSION_COOKIE_SECURE = SECURE_COOKIES
CSRF_COOKIE_SECURE = SECURE_COOKIES
SESSION_COOKIE_HTTPONLY = True
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True

# HSTS браузер запоминает надолго — включаем отдельной переменной и только
# когда сертификат выпущен и проверен
SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
# Редирект на https делает nginx; здесь он замкнулся бы на проверке здоровья
# изнутри docker-сети, которая ходит по http
SECURE_SSL_REDIRECT = False

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    # Закрыто по умолчанию: открытые ручки (вход, регистрация, здоровье)
    # помечаются явно. Забытая пометка даст 401, а не утечку
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_RENDERER_CLASSES": ("rest_framework.renderers.JSONRenderer",),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        # Экран таймера опрашивает сервер раз в 5 секунд — это 12 в минуту
        # на вкладку. Запас на пару вкладок, историю и настройки
        "user": "120/min",
        "login": "10/min",
        "register": "5/hour",
        "friends_request": "20/hour",
        "switch": "30/min",
    },
    "EXCEPTION_HANDLER": "common.errors.exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.environ.get("JWT_ACCESS_MINUTES", "30"))),
    # Пара, которая полгода не выходила из приложения, — нормальный случай.
    # Каждое обновление выдаёт новый refresh, поэтому 60 дней отсчитываются
    # от последнего открытия, а не от входа
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.environ.get("JWT_REFRESH_DAYS", "60"))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
}

APP_URL = os.environ.get("APP_URL", "http://localhost:3000").rstrip("/")

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "https://eugenepokalyuk.github.io/wait-proof/")

# Пуши после щелчка уходят в фоновом потоке, чтобы ответ не ждал серверов
# Apple и Google. В тестах — синхронно, иначе проверять нечего
PUSH_ASYNC = os.environ.get("PUSH_ASYNC", "True") == "True" and "test" not in sys.argv[1:2]

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        # 4xx — нормальная работа (неверный пароль, конфликт щелчков), в логе
        # нужны только настоящие ошибки
        "django.request": {"level": "ERROR"},
    },
}
