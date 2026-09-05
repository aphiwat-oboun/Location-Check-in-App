from django.urls import path
from . import views

app_name = 'admin_panel'

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),
    path('users/', views.users_view, name='users'),
    path('posts/', views.posts_view, name='posts'),
    path('locations/', views.locations_view, name='locations'),
    path('categories/', views.categories_view, name='categories'),
    path('comments/', views.comments_view, name='comments'),
    path('reports/', views.reports_view, name='reports'),
    path('settings/', views.settings_view, name='settings'),
    
    # API endpoints
    path('api/analytics/', views.analytics_api, name='api_analytics'),
    path('api/user/<int:user_id>/action/', views.user_action_api, name='api_user_action'),
    path('api/post/<int:post_id>/delete/', views.post_delete_api, name='api_post_delete'),
    path('api/comment/<int:comment_id>/delete/', views.comment_delete_api, name='api_comment_delete'),
    path('api/report/<int:report_id>/action/', views.report_action_api, name='api_report_action'),
    path('export/csv/', views.export_analytics_csv, name='export_csv'),
    path('api/location/<int:location_id>/delete/', views.location_delete_api, name='api_location_delete'),
    path('api/category/create/', views.category_create_api, name='api_category_create'),
    path('api/category/<int:category_id>/delete/', views.category_delete_api, name='api_category_delete'),
    path('api/user/<int:user_id>/edit/', views.user_edit_api, name='api_user_edit'),
]
