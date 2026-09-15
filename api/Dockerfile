# Образ собирается в GitHub Actions и скачивается сервером готовым: на
# сервере 1,9 ГБ памяти и уже работает Форма, собирать там нельзя.
FROM python:3.12-slim

LABEL project=wait-proof

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Статику админки собираем на этапе сборки: в образе нет секретов, поэтому
# ключ здесь фиктивный и дальше сборки не уходит
RUN DJANGO_SECRET_KEY=build DB_ENGINE=sqlite python manage.py collectstatic --noinput \
    && useradd --system --uid 10001 --home /app app \
    && chown -R app /app

USER app

EXPOSE 8000

# Один воркер с потоками: пользователей — пара человек, а каждый процесс
# Django на сервере Формы — это ~70 МБ, которые у неё отнимаются
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "1", \
     "--threads", "4", \
     "--worker-class", "gthread", \
     "--timeout", "30", \
     "--graceful-timeout", "20", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
