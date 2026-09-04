from functools import wraps
from django.http import HttpResponseForbidden, JsonResponse
from django.shortcuts import render, redirect
from django.contrib import messages

def is_admin_user(user):
    return user.is_authenticated and user.is_staff

def admin_required(view_func):
    """
    Decorator for views that checks that the user is logged in and is a staff member / admin.
    Returns HTTP 403 Forbidden or renders 403 error page if unauthorized.
    For AJAX requests, returns JSON error with 403 status.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest' or request.path.startswith('/admin-panel/api/'):
                return JsonResponse({'error': 'Unauthorized', 'detail': 'Authentication required.'}, status=401)
            messages.error(request, 'กรุณาล็อกอินด้วยบัญชีผู้ดูแลระบบเพื่อเข้าถึง Admin Panel')
            return redirect('accounts:login')

        if not request.user.is_staff:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest' or request.path.startswith('/admin-panel/api/'):
                return JsonResponse({'error': 'Forbidden', 'detail': 'Admin authorization required.'}, status=403)
            return render(request, 'admin_panel/403.html', {
                'reason': 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ บัญชีของคุณไม่ใช่ผู้ดูแลระบบ (Administrator)'
            }, status=403)

        return view_func(request, *args, **kwargs)
    return _wrapped_view

class AdminRequiredMixin:
    """
    Mixin for class-based views to enforce staff/admin status.
    """
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.error(request, 'กรุณาล็อกอินด้วยบัญชีผู้ดูแลระบบเพื่อเข้าถึง Admin Panel')
            return redirect('accounts:login')
        if not request.user.is_staff:
            return render(request, 'admin_panel/403.html', {
                'reason': 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ บัญชีของคุณไม่ใช่ผู้ดูแลระบบ (Administrator)'
            }, status=403)
        return super().dispatch(request, *args, **kwargs)
