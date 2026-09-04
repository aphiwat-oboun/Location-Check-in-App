from django.urls import path
from . import views

app_name = 'interactions'

urlpatterns = [
    path('like/<int:post_id>/', views.toggle_like_api, name='toggle_like'),
    path('save/<int:post_id>/', views.toggle_save_api, name='toggle_save'),
    path('comment/<int:post_id>/', views.add_comment_view, name='add_comment'),
    path('comments/<int:post_id>/', views.list_comments_api, name='list_comments'),
    path('notifications/', views.list_notifications_api, name='notifications_list'),
    path('notifications/read/', views.mark_notifications_read_api, name='notifications_read'),
]
