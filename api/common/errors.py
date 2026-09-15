from rest_framework import status
from rest_framework.exceptions import APIException, Throttled, ValidationError
from rest_framework.views import exception_handler as drf_exception_handler


class Conflict(APIException):
    """Состояние уже поменяли с другого устройства.

    Вместе с текстом отдаём актуальное состояние: клиенту не нужно делать
    второй запрос, чтобы вернуть ручку туда, где она на самом деле
    """

    status_code = status.HTTP_409_CONFLICT
    default_detail = "Состояние уже изменилось."

    def __init__(self, detail=None, payload=None):
        super().__init__(detail)
        self.payload = payload or {}


def _first_message(data) -> str:
    """Первое человеческое сообщение из ошибки валидации DRF.

    Приложение показывает одну строку под формой. Разбирать на клиенте
    вложенные словари полей ради одной фразы — лишняя работа в каждом экране
    """
    if isinstance(data, list) and data:
        return _first_message(data[0])
    if isinstance(data, dict) and data:
        return _first_message(next(iter(data.values())))
    return str(data)


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, ValidationError):
        # Поля оставляем — форма может подсветить конкретное — но всегда
        # добавляем detail, который можно показать как есть
        response.data = {"detail": _first_message(response.data), "fields": response.data}
    elif isinstance(exc, Throttled):
        response.data = {"detail": "Слишком много запросов. Попробуйте чуть позже."}
    elif isinstance(exc, Conflict):
        response.data = {"detail": str(exc.detail), **exc.payload}

    return response
