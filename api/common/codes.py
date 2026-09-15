"""Личные коды приглашения.

Код печатается в ссылке и иногда диктуется голосом («скинь код»), поэтому
алфавит — Crockford Base32: цифры и заглавные латинские без I, L, O, U.
Убраны буквы, которые путаются на глаз (0/O, 1/I/L). Ввод нормализуется:
регистр, пробелы, дефисы и замены O→0, I/L→1 — набрать можно как удобно.

Восемь символов — 32^8 ≈ 10^12 вариантов. Перебрать их через API с лимитом
в 120 запросов в минуту невозможно, а в ссылку код влезает целиком
"""

import re
import secrets

ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
INVITE_CODE_LEN = 8

_LOOKALIKES = str.maketrans({"O": "0", "I": "1", "L": "1", "U": "V"})
_SEPARATORS = re.compile(r"[^0-9A-Z]+")


def random_code(length: int = INVITE_CODE_LEN) -> str:
    """secrets, а не random: по коду человека добавляют в друзья, и
    предсказуемый генератор позволил бы угадать чужой"""
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


def normalize_code(raw: str) -> str:
    return _SEPARATORS.sub("", (raw or "").upper()).translate(_LOOKALIKES)
