import time
from .utils import get_client_device_details

class UserActivityTrackerMiddleware:
    """
    Middleware that automatically captures and records 100% REAL IP, 
    Device, Operating System, Browser, and Geolocation for active users in real-time.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated and hasattr(request.user, 'profile'):
            # Throttle database write: once per 10 minutes per session to preserve performance
            last_tracked = request.session.get('last_device_tracked_time', 0)
            current_time = time.time()
            
            if current_time - last_tracked > 600: # 10 minutes
                try:
                    details = get_client_device_details(request)
                    profile = request.user.profile
                    
                    if details['ip'] not in ('127.0.0.1', 'localhost', '::1') or not profile.last_login_ip:
                        profile.last_login_ip = details['ip']
                    if 'Localhost' not in details['location'] or not profile.last_login_location:
                        profile.last_login_location = details['location']
                    
                    profile.last_login_os = details['os']
                    profile.last_login_device = details['device']
                    profile.last_login_browser = details['browser']
                    
                    if not profile.signup_ip or profile.signup_ip in ('127.0.0.1', 'localhost'):
                        profile.signup_ip = details['ip']
                    if not profile.signup_location or 'Localhost' in profile.signup_location:
                        profile.signup_location = details['location']
                    if not profile.signup_os or '10/11' in profile.signup_os:
                        profile.signup_os = details['os']
                    if not profile.signup_device or 'ไม่ระบุ' in profile.signup_device:
                        profile.signup_device = details['device']
                    if not profile.signup_browser or 'ไม่ระบุ' in profile.signup_browser:
                        profile.signup_browser = details['browser']
                        
                    profile.save(update_fields=[
                        'last_login_ip', 'last_login_location', 'last_login_os',
                        'last_login_device', 'last_login_browser',
                        'signup_ip', 'signup_location', 'signup_os',
                        'signup_device', 'signup_browser'
                    ])
                    request.session['last_device_tracked_time'] = current_time
                except Exception:
                    pass

        response = self.get_response(request)
        # Request high-entropy client hints from modern browsers (Windows 11 vs 10, exact device models)
        response['Accept-CH'] = 'Sec-CH-UA-Platform-Version, Sec-CH-UA-Model, Sec-CH-UA-Arch, Sec-CH-UA-Platform'
        response['Permissions-Policy'] = 'ch-ua-platform-version=*, ch-ua-model=*'
        return response
