from apps.admin_panel.models import Notification, Report, SystemSetting

def admin_context(request):
    if request.user.is_authenticated and request.user.is_staff:
        unread_notifications_count = Notification.objects.filter(user=request.user, is_read=False).count()
        pending_reports_count = Report.objects.filter(status='pending').count()
        system_settings = SystemSetting.get_settings()
        return {
            'admin_unread_notifications': unread_notifications_count,
            'admin_pending_reports': pending_reports_count,
            'admin_user': request.user,
            'system_settings': system_settings,
        }
    return {}
