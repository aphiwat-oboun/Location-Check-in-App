from django.urls import path
from . import views

app_name = 'posts'

urlpatterns = [
    path('create/', views.create_post_view, name='create'),
    path('mine/', views.my_posts_view, name='my_posts'),
    path('<int:pk>/', views.post_detail_view, name='detail'),
    path('<int:pk>/edit/', views.edit_post_view, name='edit'),
    path('<int:pk>/delete/', views.delete_post_view, name='delete'),
]
