from django.db import models


class Singleton(models.Model):
    """Настройка, которой всегда ровно одна строка.

    Тексты пушей и лимиты меняются из админки без выкатки. pk прибит к
    единице, удаление запрещено — в админке раздел ведёт себя как одна
    форма, а не как список, где можно завести вторую строку и гадать,
    какая из них рабочая
    """

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        return (0, {})

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
