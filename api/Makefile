.PHONY: install migrate makemigrations admin runserver check test vapid tick

install:
	pip install -r requirements.txt

makemigrations:
	python manage.py makemigrations

# createcachetable — рядом с migrate: счётчики лимитов лежат в таблице кэша,
# а migrate её не создаёт
migrate:
	python manage.py migrate
	python manage.py createcachetable

admin:
	python manage.py createsuperuser

runserver:
	python manage.py runserver 0.0.0.0:8000

check:
	python manage.py check

test:
	python manage.py test

vapid:
	python manage.py vapid_keys

tick:
	python manage.py tick
