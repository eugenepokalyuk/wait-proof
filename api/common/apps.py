from django.contrib.admin.apps import AdminConfig


class WaitProofAdminConfig(AdminConfig):
    """Подменяет админку Django на нашу — ради порядка разделов.

    Через AdminConfig, а не заменой admin.site вручную: так `admin.site`
    сразу указывает на наш класс, и все @admin.register работают без правок.
    Своих моделей у common нет, поэтому отдельным приложением он не
    подключается — только этим классом
    """

    default_site = "common.admin.WaitProofAdminSite"
