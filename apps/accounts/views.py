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

from django.views.decorators.http import require_POST, require_GET
from django.http import JsonResponse

from .models import Profile, Follow
from apps.admin_panel.models import AuditLog
from apps.interactions.models import Like, SavedPost
from apps.posts.models import Post

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
        
        terms_consent = request.POST.get('terms_consent')
        
        if not terms_consent:
            messages.error(request, 'กรุณากดยอมรับข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิก')
            return render(request, 'accounts/register.html')

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


def profile_view(request, username=None):
    if username:
        user_obj = get_object_or_404(User, username=username)
    else:
        if not request.user.is_authenticated:
            return redirect('accounts:login')
        user_obj = request.user
        
    profile = user_obj.profile
    posts = list(user_obj.posts.filter(is_published=True).select_related('location', 'category').order_by('-created_at'))
    saved_posts = list(user_obj.saved_posts.select_related('post', 'post__location', 'post__user', 'post__user__profile').order_by('-created_at'))
    
    # Liked posts by this user
    liked_posts_qs = Post.objects.filter(likes__user=user_obj, is_published=True).select_related('location', 'user', 'user__profile').order_by('-likes__created_at')[:30]
    liked_posts = list(liked_posts_qs)

    total_posts = len(posts)
    total_photos = sum([p.images.count() + (1 if p.cover_image or p.cover_image_url else 0) for p in posts])
    total_places = len(set([p.location_id for p in posts if p.location_id]))

    # TikTok Signature Stats
    following_count = user_obj.following_set.count()
    followers_count = user_obj.followers_set.count()
    total_likes_received = Like.objects.filter(post__user=user_obj).count()

    is_own_profile = bool(request.user.is_authenticated and request.user == user_obj)
    is_following = False
    if request.user.is_authenticated and not is_own_profile:
        is_following = Follow.objects.filter(follower=request.user, following=user_obj).exists()

    if request.user.is_authenticated:
        all_post_objs = posts + [sp.post for sp in saved_posts if sp.post] + liked_posts
        user_liked_ids = set(Like.objects.filter(user=request.user, post__in=all_post_objs).values_list('post_id', flat=True))
        user_saved_ids = set(SavedPost.objects.filter(user=request.user, post__in=all_post_objs).values_list('post_id', flat=True))
        for p in posts:
            p.is_liked = p.id in user_liked_ids
            p.is_saved = p.id in user_saved_ids
        for sp in saved_posts:
            if sp.post:
                sp.post.is_liked = sp.post.id in user_liked_ids
                sp.post.is_saved = sp.post.id in user_saved_ids
        for lp in liked_posts:
            lp.is_liked = lp.id in user_liked_ids
            lp.is_saved = lp.id in user_saved_ids

    context = {
        'profile_user': user_obj,
        'profile': profile,
        'posts': posts,
        'saved_posts': saved_posts,
        'liked_posts': liked_posts,
        'total_posts': total_posts,
        'total_photos': total_photos,
        'total_places': total_places,
        'following_count': following_count,
        'followers_count': followers_count,
        'total_likes_received': total_likes_received,
        'is_following': is_following,
        'is_own_profile': is_own_profile,
        'active_tab': request.GET.get('tab', 'posts')
    }
    return render(request, 'accounts/profile.html', context)


@require_POST
def toggle_follow_api(request, username):
    """
    AJAX handler to follow or unfollow a user (TikTok style)
    """
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'unauthenticated', 'message': 'กรุณาเข้าสู่ระบบก่อนดำเนินการ'}, status=401)

    target_user = get_object_or_404(User, username=username)
    if target_user == request.user:
        return JsonResponse({'success': False, 'message': 'คุณไม่สามารถติดตามตัวเองได้'}, status=400)

    follow_obj = Follow.objects.filter(follower=request.user, following=target_user).first()
    if follow_obj:
        follow_obj.delete()
        is_following = False
        msg = f'เลิกติดตาม @{target_user.username} แล้ว'
    else:
        Follow.objects.create(follower=request.user, following=target_user)
        is_following = True
        msg = f'ติดตาม @{target_user.username} แล้ว'

        # Send notification
        try:
            from apps.interactions.models import Notification
            Notification.objects.create(
                recipient=target_user,
                actor=request.user,
                notification_type='follow',
                text='ได้เริ่มติดตามคุณ'
            )
        except Exception as e:
            pass

    return JsonResponse({
        'success': True,
        'is_following': is_following,
        'followers_count': target_user.followers_set.count(),
        'message': msg
    })


@require_GET
def follow_list_api(request, username):
    """
    AJAX endpoint to return followers or following list for TikTok-style popup modal
    """
    list_type = request.GET.get('type', 'followers') # 'followers' or 'following'
    target_user = get_object_or_404(User, username=username)

    if list_type == 'following':
        users_qs = User.objects.filter(followers_set__follower=target_user).select_related('profile')
        title = 'กำลังติดตาม'
    else:
        users_qs = User.objects.filter(following_set__following=target_user).select_related('profile')
        title = 'ผู้ติดตาม'

    current_user_following_ids = set()
    if request.user.is_authenticated:
        current_user_following_ids = set(Follow.objects.filter(follower=request.user).values_list('following_id', flat=True))

    data = []
    for u in users_qs[:60]:
        data.append({
            'username': u.username,
            'display_name': u.profile.get_display_name() if hasattr(u, 'profile') else u.username,
            'avatar_url': u.profile.get_avatar_url() if hasattr(u, 'profile') else '',
            'bio': (u.profile.bio[:60] + '...') if hasattr(u, 'profile') and len(u.profile.bio) > 60 else (u.profile.bio if hasattr(u, 'profile') else ''),
            'is_following': u.id in current_user_following_ids,
            'is_self': request.user.is_authenticated and request.user.id == u.id
        })

    return JsonResponse({
        'success': True,
        'title': title,
        'count': target_user.followers_set.count() if list_type == 'followers' else target_user.following_set.count(),
        'users': data
    })

@login_required
def edit_profile_view(request):
    profile = request.user.profile
    if request.method == 'POST':
        display_name = request.POST.get('display_name')
        bio = request.POST.get('bio')
        city = request.POST.get('city')
        if 'avatar' in request.FILES:
            profile.avatar = request.FILES['avatar']
        if 'cover_image' in request.FILES:
            profile.cover_image = request.FILES['cover_image']
        profile.display_name = display_name
        profile.bio = bio
        profile.city = city
        profile.save()
        messages.success(request, 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว')
        return redirect('accounts:profile')
    return render(request, 'accounts/edit_profile.html', {'profile': profile})
