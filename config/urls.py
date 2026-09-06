from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from django.http import JsonResponse
from apps.core import views as core_views

urlpatterns = [
    path('.well-known/appspecific/com.chrome.devtools.json', lambda r: JsonResponse({})),
    path('manifest.json', core_views.manifest_view, name='manifest'),
    path('sw.js', core_views.service_worker_view, name='service_worker'),
    path('admin/', admin.site.urls),
    path('admin-panel/', include('apps.admin_panel.urls', namespace='admin_panel')),
    path('', include('apps.core.urls', namespace='core')),
    path('accounts/', include('apps.accounts.urls', namespace='accounts')),
    path('locations/', include('apps.locations.urls', namespace='locations')),
    path('posts/', include('apps.posts.urls', namespace='posts')),
    path('interactions/', include('apps.interactions.urls', namespace='interactions')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
