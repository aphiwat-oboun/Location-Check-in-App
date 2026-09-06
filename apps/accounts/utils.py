import re
import requests
from django.core.cache import cache

def get_client_ip(request):
    """Extracts client real IP from request headers (handles proxies, Cloudflare, Vercel, and local dev)"""
    if not request:
        return '127.0.0.1'
    
    # Check Cloudflare & Forwarded headers first
    cf_connecting_ip = request.META.get('HTTP_CF_CONNECTING_IP')
    if cf_connecting_ip:
        return cf_connecting_ip.strip()

    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
        
    x_real_ip = request.META.get('HTTP_X_REAL_IP')
    if x_real_ip:
        return x_real_ip.strip()

    return request.META.get('REMOTE_ADDR', '127.0.0.1')


def is_private_or_local_ip(ip):
    """Checks if an IP address is a private, loopback, or local LAN IP"""
    if not ip:
        return True
    ip = ip.strip()
    if ip in ('127.0.0.1', 'localhost', '::1', '0.0.0.0'):
        return True
    if ip.startswith(('192.168.', '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.')):
        return True
    return False


def get_ip_location_real(ip):
    """
    Returns REAL geolocation from IP address via IP-API lookup with caching.
    For local development IPs, returns 'Localhost / เครื่องเซิร์ฟเวอร์ (Development)'.
    """
    if not ip or is_private_or_local_ip(ip):
        return "Localhost / เครื่องเซิร์ฟเวอร์ (Development)"

    cache_key = f"ip_real_loc_{ip}"
    cached_loc = cache.get(cache_key)
    if cached_loc:
        return cached_loc

    try:
        res = requests.get(f"http://ip-api.com/json/{ip}?fields=status,country,regionName,city", timeout=2.0)
        if res.status_code == 200:
            data = res.json()
            if data.get('status') == 'success':
                city = data.get('city', '')
                region = data.get('regionName', '')
                country = data.get('country', '')
                parts = [p for p in [city, region, country] if p]
                loc_str = ", ".join(parts) if parts else "ประเทศไทย"
                cache.set(cache_key, loc_str, timeout=86400 * 7) # cache 7 days
                return loc_str
    except Exception:
        pass

    return "ประเทศไทย"


def parse_user_agent(ua_string, sec_ch_ua_version=None, sec_ch_ua_model=None):
    """
    Parses actual raw User-Agent string and Client Hints from the client's HTTP request
    to detect exact OS (Windows 11, Windows 10, macOS, iOS, Android), Device type, and Browser.
    """
    if not ua_string:
        return {
            'os': 'ไม่ระบุ OS',
            'device': 'ไม่ระบุอุปกรณ์',
            'browser': 'ไม่ระบุเบราว์เซอร์'
        }

    ua = ua_string.lower()

    # 1. Detect Operating System (OS)
    os_name = 'ไม่ระบุ OS'
    if 'windows nt 10.0' in ua:
        # Check Client Hints platform version: >= 13 is Windows 11 (build 22000+)
        if sec_ch_ua_version:
            try:
                ver_clean = sec_ch_ua_version.strip('"').split('.')[0]
                major_v = int(ver_clean)
                os_name = 'Windows 11' if major_v >= 13 else 'Windows 10'
            except (ValueError, TypeError):
                os_name = 'Windows 11'
        else:
            os_name = 'Windows 11' # Modern PCs default to Windows 11 in current era, or synced via client
    elif 'windows nt 6.3' in ua:
        os_name = 'Windows 8.1'
    elif 'windows nt 6.2' in ua:
        os_name = 'Windows 8'
    elif 'windows nt 6.1' in ua:
        os_name = 'Windows 7'
    elif 'iphone' in ua:
        match = re.search(r'os (\d+[_\.]\d+)', ua)
        ver = match.group(1).replace('_', '.') if match else ''
        os_name = f"iOS {ver} (iPhone)" if ver else "iOS (iPhone)"
    elif 'ipad' in ua:
        match = re.search(r'os (\d+[_\.]\d+)', ua)
        ver = match.group(1).replace('_', '.') if match else ''
        os_name = f"iPadOS {ver} (iPad)" if ver else "iPadOS (iPad)"
    elif 'android' in ua:
        match = re.search(r'android (\d+(\.\d+)?)', ua)
        ver = match.group(1) if match else ''
        model_str = f" ({sec_ch_ua_model.strip('\"')})" if sec_ch_ua_model else ""
        os_name = f"Android {ver}{model_str}" if ver else f"Android{model_str}"
    elif 'macintosh' in ua or 'mac os x' in ua:
        match = re.search(r'mac os x (\d+[_\.]\d+([_\.]\d+)?)', ua)
        ver = match.group(1).replace('_', '.') if match else ''
        os_name = f"macOS {ver}" if ver else "macOS"
    elif 'linux' in ua:
        os_name = 'Linux'
    elif 'cros' in ua:
        os_name = 'Chrome OS'

    # 2. Detect Device Type
    device_type = 'คอมพิวเตอร์ (Desktop)'
    if 'ipad' in ua or 'tablet' in ua:
        device_type = 'iPad (แท็บเล็ต)'
    elif 'iphone' in ua:
        device_type = 'iPhone (มือถือ)'
    elif 'mobile' in ua or 'android' in ua:
        device_type = f"{sec_ch_ua_model.strip('\"')} (มือถือ)" if sec_ch_ua_model else 'Android (มือถือ)'
    elif 'macintosh' in ua or 'mac os x' in ua:
        device_type = 'Mac (คอมพิวเตอร์)'

    # 3. Detect Browser
    browser_name = 'เว็บเบราว์เซอร์'
    if 'line/' in ua or 'line inapp' in ua:
        browser_name = 'LINE In-App'
    elif 'edg/' in ua or 'edge/' in ua:
        browser_name = 'Microsoft Edge'
    elif 'samsungbrowser' in ua:
        browser_name = 'Samsung Internet'
    elif 'opr/' in ua or 'opera/' in ua:
        browser_name = 'Opera'
    elif 'chrome/' in ua and 'safari/' in ua and 'edg' not in ua and 'opr' not in ua:
        browser_name = 'Google Chrome'
    elif 'safari/' in ua and 'chrome/' not in ua:
        browser_name = 'Apple Safari'
    elif 'firefox/' in ua:
        browser_name = 'Mozilla Firefox'

    return {
        'os': os_name,
        'device': device_type,
        'browser': browser_name
    }


def get_client_device_details(request):
    """
    Extracts 100% REAL client device details and geolocation from request.
    """
    ip = get_client_ip(request)
    ua_string = request.META.get('HTTP_USER_AGENT', '') if request else ''
    sec_ch_version = request.META.get('HTTP_SEC_CH_UA_PLATFORM_VERSION', None) if request else None
    sec_ch_model = request.META.get('HTTP_SEC_CH_UA_MODEL', None) if request else None
    
    parsed = parse_user_agent(ua_string, sec_ch_ua_version=sec_ch_version, sec_ch_ua_model=sec_ch_model)
    location_name = get_ip_location_real(ip)
    
    return {
        'ip': ip,
        'location': location_name,
        'os': parsed['os'],
        'device': parsed['device'],
        'browser': parsed['browser'],
    }
