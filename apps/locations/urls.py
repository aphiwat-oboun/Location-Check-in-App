from django.urls import path
from . import views

app_name = 'locations'

urlpatterns = [
    path('<int:pk>/', views.location_detail_view, name='detail'),
    path('api/list/', views.api_locations, name='api_list'),
]
