from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('', views.home_view, name='home'),
    path('explore/', views.explore_view, name='explore'),
    path('map/', views.map_view, name='map'),
    path('welcome/', views.welcome_view, name='welcome'),
    path('saved/', views.saved_places_view, name='saved'),
]
