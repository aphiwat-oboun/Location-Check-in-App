import os
import requests
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.cache import cache
from django.conf import settings
from django.urls import reverse

from .models import Profile
from apps.admin_panel.models import AuditLog

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def log_security_event(user, action, details='', request=None):
    ip = get_client_ip(request) if request else None
    AuditLog.objects.create(
        admin_user=user if user and user.is_authenticated else None,
        action=action,
        target_repr=user.username if user else 'Anonymous',
        details=details,
        ip_address=ip
    )

def register_view(request):
    if request.user.is_authenticated:
        return redirect('core:home')
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '').strip()
        confirm_password = request.POST.get('confirm_password', '').strip()
        display_name = request.POST.get('display_name', username).strip()
        
        if not username or not password or not confirm_password or not email:
            messages.error(request, 'กรุณากรอกข้อมูลให้ครบถ้วน (รวมถึงชื่อผู้ใช้, อีเมล, รหัสผ่าน และการยืนยันรหัสผ่าน)')
            return render(request, 'accounts/register.html')
        
        if password != confirm_password:
            messages.error(request, 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง')
            return render(request, 'accounts/register.html')
        
        if User.objects.filter(username__iexact=username).exists():
            messages.error(request, f'ชื่อผู้ใช้ "{username}" นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น')
            return render(request, 'accounts/register.html')

        if User.objects.filter(email__iexact=email).exists():
            messages.error(request, f'อีเมล "{email}" นี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น')
            return render(request, 'accounts/register.html')

        try:
            user = User.objects.create_user(username=username, email=email, password=password, first_name=display_name)
            user.profile.display_name = display_name
            user.profile.save()
        except Exception as e:
            messages.error(request, 'ไม่สามารถสร้างบัญชีได้ ชื่อผู้ใช้หรืออีเมลนี้มีอยู่ในระบบแล้ว')
            return render(request, 'accounts/register.html')

        login(request, user)
        request.session.cycle_key()
        log_security_event(user, "สมัครสมาชิกสำเร็จ", request=request)
        messages.success(request, 'สร้างบัญชีสำเร็จ ยินดีต้อนรับสู่ ที่นี่มีอะไร?')
        return redirect('core:home')
        
    return render(request, 'accounts/register.html')

def login_view(request):
    if request.user.is_authenticated:
        if request.user.is_staff:
            return redirect('admin_panel:dashboard')
        return redirect('core:home')

    ip = get_client_ip(request)
    cache_key = f"login_attempts_{ip}"
    failed_attempts = cache.get(cache_key, 0)

    # 1. Advanced Rate Limiting / Brute-force Lockout Check (Max 5 attempts per 15 mins)
    if failed_attempts >= 5:
        messages.error(
            request, 
            '🔒 ตรวจพบความพยายามเข้าสู่ระบบถี่เกินไป ระบบได้ระงับการเข้าสู่ระบบชั่วคราวเป็นเวลา 15 นาที เพื่อความปลอดภัยของบัญชี'
        )
        log_security_event(None, "ระงับการ Login ชั่วคราว (Brute-force Block)", f"IP: {ip}", request=request)
        return render(request, 'accounts/login.html')

    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            
            # 2. Check if account is suspended by Admin
            if hasattr(user, 'profile') and user.profile.is_suspended:
                messages.error(request, '⛔ บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ')
                log_security_event(user, "พยายามล็อกอินบัญชีที่ถูกระงับ", request=request)
                return render(request, 'accounts/login.html', {'form': form})

            # 3. Successful Login - Reset brute force counter & cycle session key
            cache.delete(cache_key)
            login(request, user)
            request.session.cycle_key()

            log_security_event(user, "เข้าสู่ระบบสำเร็จ", request=request)
            messages.success(request, f'ยินดีต้อนรับกลับ, {user.profile.get_display_name()}!')
            
            next_url = request.GET.get('next')
            if next_url:
                return redirect(next_url)
            if user.is_staff:
                return redirect('admin_panel:dashboard')
            return redirect('core:home')
        else:
            # Increment failed attempt count in cache (15 mins timeout)
            failed_attempts += 1
            cache.set(cache_key, failed_attempts, timeout=900)
            log_security_event(None, "เข้าสู่ระบบไม่สำเร็จ (รหัสผ่านไม่ถูกต้อง)", f"IP: {ip}, Attempts: {failed_attempts}", request=request)
            messages.error(request, f'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (พยายามแล้ว {failed_attempts}/5 ครั้ง)')
    else:
        form = AuthenticationForm()

    return render(request, 'accounts/login.html', {'form': form})


def logout_view(request):
    if request.user.is_authenticated:
        log_security_event(request.user, "ออกจากระบบ", request=request)
    logout(request)
    messages.info(request, 'ออกจากระบบเรียบร้อยแล้ว')
    return redirect('core:home')


# =========================================================================
# OAUTH SOCIAL LOGIN: GOOGLE LOGIN
# =========================================================================

def google_login_view(request):
    """Initiates Google OAuth2 authentication flow"""
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        # Graceful fallback demo mode when credentials are not configured yet
        messages.info(request, '💡 กำลังทดสอบระบบ Google Login (Demo Mode)...')
        return redirect('accounts:google_callback')

    redirect_uri = request.build_absolute_uri(reverse('accounts:google_callback'))
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code&client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"scope=openid%20email%20profile&prompt=select_account"
    )
    return redirect(google_auth_url)


def google_callback_view(request):
    """Handles Google OAuth2 callback"""
    code = request.GET.get('code')
    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET
    redirect_uri = request.build_absolute_uri(reverse('accounts:google_callback'))

    google_email = "user.google@example.com"
    google_name = "Google User"
    google_avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"

    if code and client_id and client_secret:
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            'code': code,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code'
        }
        token_res = requests.post(token_url, data=token_data)
        if token_res.status_code == 200:
            access_token = token_res.json().get('access_token')
            user_info_res = requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={'Authorization': f'Bearer {access_token}'}
            )
            if user_info_res.status_code == 200:
                user_info = user_info_res.json()
                google_email = user_info.get('email', google_email)
                google_name = user_info.get('name', google_name)
                google_avatar = user_info.get('picture', google_avatar)

    # Find or Create User
    username = f"google_{google_email.split('@')[0]}"
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': google_email, 'first_name': google_name}
    )
    if created:
        user.set_unusable_password()
        user.save()

    profile = user.profile
    profile.display_name = google_name
    if google_avatar:
        profile.avatar_url = google_avatar
    profile.save()

    login(request, user)
    request.session.cycle_key()
    log_security_event(user, "เข้าสู่ระบบด้วย Google Login", request=request)
    messages.success(request, f'เข้าสู่ระบบด้วย Google สำเร็จ! ยินดีต้อนรับคุณ {google_name}')
    return redirect('core:home')


# =========================================================================
# OAUTH SOCIAL LOGIN: LINE LOGIN
# =========================================================================

def line_login_view(request):
    """Initiates LINE Login authentication flow"""
    channel_id = settings.LINE_CHANNEL_ID
    if not channel_id:
        # Graceful fallback demo mode when credentials are not configured yet
        messages.info(request, '💡 กำลังทดสอบระบบ LINE Login (Demo Mode)...')
        return redirect('accounts:line_callback')

    redirect_uri = request.build_absolute_uri(reverse('accounts:line_callback'))
    line_auth_url = (
        f"https://access.line.me/oauth2/v2.1/authorize?"
        f"response_type=code&client_id={channel_id}&"
        f"redirect_uri={redirect_uri}&"
        f"state=line_state_secret&scope=profile%20openid%20email"
    )
    return redirect(line_auth_url)


def line_callback_view(request):
    """Handles LINE Login callback"""
    code = request.GET.get('code')
    channel_id = settings.LINE_CHANNEL_ID
    channel_secret = settings.LINE_CHANNEL_SECRET
    redirect_uri = request.build_absolute_uri(reverse('accounts:line_callback'))

    line_name = "LINE User"
    line_avatar = "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200"
    line_user_id = "line_user_demo"

    if code and channel_id and channel_secret:
        token_url = "https://api.line.me/oauth2/v2.1/token"
        token_data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri,
            'client_id': channel_id,
            'client_secret': channel_secret
        }
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        token_res = requests.post(token_url, data=token_data, headers=headers)
        if token_res.status_code == 200:
            access_token = token_res.json().get('access_token')
            profile_res = requests.get(
                "https://api.line.me/v2/profile",
                headers={'Authorization': f'Bearer {access_token}'}
            )
            if profile_res.status_code == 200:
                profile_info = profile_res.json()
                line_user_id = profile_info.get('userId', line_user_id)
                line_name = profile_info.get('displayName', line_name)
                line_avatar = profile_info.get('pictureUrl', line_avatar)

    # Find or Create User
    username = f"line_{line_user_id[:12]}"
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'first_name': line_name}
    )
    if created:
        user.set_unusable_password()
        user.save()

    profile = user.profile
    profile.display_name = line_name
    if line_avatar:
        profile.avatar_url = line_avatar
    profile.save()

    login(request, user)
    request.session.cycle_key()
    log_security_event(user, "เข้าสู่ระบบด้วย LINE Login", request=request)
    messages.success(request, f'เข้าสู่ระบบด้วย LINE สำเร็จ! ยินดีต้อนรับคุณ {line_name}')
    return redirect('core:home')


@login_required
def profile_view(request, username=None):
    if username:
        user_obj = get_object_or_404(User, username=username)
    else:
        user_obj = request.user
        
    profile = user_obj.profile
    posts = user_obj.posts.filter(is_published=True).order_by('-created_at')
    saved_posts = user_obj.saved_posts.select_related('post', 'post__location').order_by('-created_at')
    
    total_posts = posts.count()
    total_photos = sum([p.images.count() + (1 if p.cover_image or p.cover_image_url else 0) for p in posts])
    total_places = posts.values('location').distinct().count()

    context = {
        'profile_user': user_obj,
        'profile': profile,
        'posts': posts,
        'saved_posts': saved_posts,
        'total_posts': total_posts,
        'total_photos': total_photos,
        'total_places': total_places,
        'is_own_profile': request.user == user_obj,
        'active_tab': request.GET.get('tab', 'posts')
    }
    return render(request, 'accounts/profile.html', context)

@login_required
def edit_profile_view(request):
    profile = request.user.profile
    if request.method == 'POST':
        display_name = request.POST.get('display_name')
        bio = request.POST.get('bio')
        city = request.POST.get('city')
        if 'avatar' in request.FILES:
            profile.avatar = request.FILES['avatar']
        profile.display_name = display_name
        profile.bio = bio
        profile.city = city
        profile.save()
        messages.success(request, 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว')
        return redirect('accounts:profile')
    return render(request, 'accounts/edit_profile.html', {'profile': profile})
