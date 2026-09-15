from django.contrib import admin

# Порядок разделов на главной админки — в порядке того, зачем её открывают:
# люди, их таймеры и ожидания, дружба, пуши, настройки. По алфавиту Django
# поставил бы «Друзей» первыми, а «Пользователей» — в конец
#
# Разделы, которых здесь нет (JWT-токены), идут следом по алфавиту
APP_ORDER = ["accounts", "timers", "friends", "push", "siteconf"]


class WaitProofAdminSite(admin.AdminSite):
    site_header = "Я тебя жду"
    site_title = "Я тебя жду"
    index_title = "Администрирование"

    def get_app_list(self, request, app_label=None):
        app_list = super().get_app_list(request, app_label)

        def position(app):
            try:
                return (0, APP_ORDER.index(app["app_label"]))
            except ValueError:
                return (1, 0)

        # sorted устойчивая: остальные разделы сохраняют порядок Django
        return sorted(app_list, key=position)
