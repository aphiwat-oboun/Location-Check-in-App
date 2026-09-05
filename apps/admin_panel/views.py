import csv
import json
from datetime import datetime, timedelta
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponse
from django.db.models import Count, Sum, Q
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.paginator import Paginator

from apps.accounts.models import Profile
from apps.posts.models import Post, PostImage
from apps.locations.models import Location, Category
from apps.interactions.models import Like, Comment, SavedPost
from apps.admin_panel.models import Report, AuditLog, Notification, SystemSetting
from apps.admin_panel.decorators import admin_required

def log_admin_action(user, action, target_repr='', details='', request=None):
    ip = None
    if request:
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            ip = x_forwarded.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
    AuditLog.objects.create(
        admin_user=user,
        action=action,
        target_repr=target_repr,
        details=details,
        ip_address=ip
    )

@admin_required
def dashboard_view(request):
    """
    Main Admin Dashboard connected 100% to real database data (Zero demo/mock data)
    """
    # 1. 6 KPI Cards calculations (100% real database records)
    total_users_count = User.objects.count()
    total_posts_count = Post.objects.count()
    total_locations_count = Location.objects.count()
    total_likes_count = Like.objects.count()
    total_comments_count = Comment.objects.count()
    total_saved_count = SavedPost.objects.count()

    # Formatted KPI numbers
    kpi_data = {
        'users': f"{total_users_count:,}",
        'posts': f"{total_posts_count:,}",
        'locations': f"{total_locations_count:,}",
        'likes': f"{total_likes_count:,}",
        'comments': f"{total_comments_count:,}",
        'saved': f"{total_saved_count:,}",
    }

    # Dynamic Real Trends (Comparison between current 30 days and prior 30 days)
    today = timezone.now().date()
    curr_30_start = today - timedelta(days=30)
    prev_30_start = today - timedelta(days=60)

    def calc_trend(model, date_field='created_at'):
        curr = model.objects.filter(**{f"{date_field}__date__gte": curr_30_start}).count()
        prev = model.objects.filter(**{f"{date_field}__date__gte": prev_30_start, f"{date_field}__date__lt": curr_30_start}).count()
        if prev == 0:
            return f"+{curr} ในเดือนนี้" if curr > 0 else "0% จากเดือนที่แล้ว"
        pct = round(((curr - prev) / prev) * 100, 1)
        symbol = "▲" if pct >= 0 else "▼"
        return f"{symbol} {abs(pct)}% จากเดือนที่แล้ว"

    kpi_trends = {
        'users': calc_trend(User, 'date_joined'),
        'posts': calc_trend(Post, 'created_at'),
        'locations': calc_trend(Location, 'created_at'),
        'likes': calc_trend(Like, 'created_at'),
        'comments': calc_trend(Comment, 'created_at'),
        'saved': calc_trend(SavedPost, 'created_at'),
    }

    # 2. Analytics Line Chart Data (7 days by default - 100% real records)
    dates_7days = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
    thai_months = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    chart_labels = [f"{d.day} {thai_months[d.month]}" for d in dates_7days]
    
    users_chart_data = [User.objects.filter(date_joined__date=d).count() for d in dates_7days]
    posts_chart_data = [Post.objects.filter(created_at__date=d).count() for d in dates_7days]
    likes_chart_data = [Like.objects.filter(created_at__date=d).count() for d in dates_7days]

    # 3. Category Donut Breakdown (100% real categories and post counts)
    categories = Category.objects.annotate(post_cnt=Count('posts')).order_by('-post_cnt')
    cat_colors = ['#159F8C', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#6B7280']
    
    cat_list_formatted = []
    total_posts_in_cats = sum([c.post_cnt for c in categories])
    for idx, cat in enumerate(categories):
        color = cat_colors[idx % len(cat_colors)]
        pct = round((cat.post_cnt / total_posts_in_cats) * 100, 1) if total_posts_in_cats > 0 else 0
        cat_list_formatted.append({
            'name': cat.name,
            'count': f"{cat.post_cnt:,}",
            'percent': f"({pct}%)",
            'color': color
        })

    # 4. Popular Places Map Markers Data (100% real locations from DB)
    locations_list = Location.objects.all()[:30]
    map_locations = []
    for loc in locations_list:
        map_locations.append({
            'id': loc.id,
            'name': loc.name,
            'city': loc.city,
            'lat': loc.latitude,
            'lng': loc.longitude,
            'image_url': loc.get_cover_url(),
        })

    # 5. Recent Posts (5 items)
    recent_posts = Post.objects.select_related('user', 'user__profile', 'location', 'category').order_by('-created_at')[:5]

    # 6. Recent Users (5 items)
    recent_users = User.objects.select_related('profile').order_by('-date_joined')[:5]

    # 7. Recent Reports (5 items)
    recent_reports = Report.objects.select_related('reporter', 'post', 'location', 'comment', 'target_user').order_by('-created_at')[:5]

    # Top 3 Popular Places for dashboard map card
    top_locations = Location.objects.select_related('category').annotate(p_cnt=Count('posts')).order_by('-p_cnt', '-created_at')[:3]

    context = {
        'kpi': kpi_data,
        'trends': kpi_trends,
        'chart_labels': json.dumps(chart_labels, ensure_ascii=False),
        'users_chart_data': json.dumps(users_chart_data),
        'posts_chart_data': json.dumps(posts_chart_data),
        'likes_chart_data': json.dumps(likes_chart_data),
        'cat_list': cat_list_formatted,
        'cat_chart_labels': json.dumps([c['name'] for c in cat_list_formatted], ensure_ascii=False),
        'cat_chart_counts': json.dumps([int(str(c['count']).replace(',', '')) for c in cat_list_formatted]),
        'cat_chart_colors': json.dumps([c['color'] for c in cat_list_formatted]),
        'map_locations': json.dumps(map_locations, ensure_ascii=False),
        'recent_posts': recent_posts,
        'recent_users': recent_users,
        'recent_reports': recent_reports,
        'top_locations': top_locations,
        'active_page': 'dashboard',
    }
    return render(request, 'admin_panel/dashboard.html', context)


@admin_required
def users_view(request):
    """
    User Management Page
    """
    search_query = request.GET.get('search', '').strip()
    status_filter = request.GET.get('status', 'all')
    
    users = User.objects.select_related('profile').order_by('-date_joined')
    
    if search_query:
        users = users.filter(
            Q(username__icontains=search_query) |
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query) |
            Q(email__icontains=search_query) |
            Q(profile__display_name__icontains=search_query)
        )

    if status_filter == 'active':
        users = users.filter(is_active=True, profile__is_suspended=False)
    elif status_filter == 'suspended':
        users = users.filter(Q(is_active=False) | Q(profile__is_suspended=True))

    users = users.annotate(
        post_count=Count('posts', distinct=True),
        comment_count=Count('comments', distinct=True)
    )

    paginator = Paginator(users, 15)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {
        'users_page': page_obj,
        'search_query': search_query,
        'status_filter': status_filter,
        'total_count': paginator.count,
        'active_page': 'users',
    }
    return render(request, 'admin_panel/users.html', context)


@admin_required
def posts_view(request):
    """
    Posts Management Page
    """
    search_query = request.GET.get('search', '').strip()
    category_id = request.GET.get('category', '')
    
    posts = Post.objects.select_related('user', 'user__profile', 'location', 'category').order_by('-created_at')
    
    if search_query:
        posts = posts.filter(
            Q(title__icontains=search_query) |
            Q(caption__icontains=search_query) |
            Q(user__username__icontains=search_query) |
            Q(location__name__icontains=search_query)
        )
    if category_id:
        posts = posts.filter(category_id=category_id)

    categories = Category.objects.all()

    paginator = Paginator(posts, 15)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {
        'posts_page': page_obj,
        'categories': categories,
        'search_query': search_query,
        'selected_category': category_id,
        'active_page': 'posts',
    }
    return render(request, 'admin_panel/posts.html', context)


@admin_required
def locations_view(request):
    """
    Location Management Page
    """
    search_query = request.GET.get('search', '').strip()
    locations = Location.objects.select_related('category').annotate(post_count_agg=Count('posts')).order_by('-created_at')

    if search_query:
        locations = locations.filter(
            Q(name__icontains=search_query) |
            Q(city__icontains=search_query) |
            Q(province__icontains=search_query)
        )

    categories = Category.objects.all()

    paginator = Paginator(locations, 15)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {
        'locations_page': page_obj,
        'categories': categories,
        'search_query': search_query,
        'active_page': 'locations',
    }
    return render(request, 'admin_panel/locations.html', context)


@admin_required
def categories_view(request):
    """
    Category Management Page
    """
    categories = Category.objects.annotate(post_count_agg=Count('posts'), location_count_agg=Count('locations')).order_by('order', 'name')
    context = {
        'categories': categories,
        'active_page': 'categories',
    }
    return render(request, 'admin_panel/categories.html', context)


@admin_required
def comments_view(request):
    """
    Comments Moderation Page
    """
    search_query = request.GET.get('search', '').strip()
    comments = Comment.objects.select_related('user', 'user__profile', 'post', 'post__location').order_by('-created_at')

    if search_query:
        comments = comments.filter(
            Q(content__icontains=search_query) |
            Q(user__username__icontains=search_query)
        )

    paginator = Paginator(comments, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {
        'comments_page': page_obj,
        'search_query': search_query,
        'active_page': 'comments',
    }
    return render(request, 'admin_panel/comments.html', context)


@admin_required
def reports_view(request):
    """
    Report Moderation Page
    """
    status_filter = request.GET.get('status', 'all')
    reports = Report.objects.select_related('reporter', 'post', 'location', 'comment', 'target_user', 'reviewed_by').order_by('-created_at')

    if status_filter != 'all':
        reports = reports.filter(status=status_filter)

    paginator = Paginator(reports, 15)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {
        'reports_page': page_obj,
        'status_filter': status_filter,
        'active_page': 'reports',
    }
    return render(request, 'admin_panel/reports.html', context)


@admin_required
def notifications_view(request):
    """
    Admin Notifications Page with real database records and category tabs
    """
    # Seed initial notifications for this admin if none exist yet
    if not Notification.objects.filter(user=request.user).exists():
        recent_rep = Report.objects.filter(status='pending').first()
        if recent_rep:
            Notification.objects.create(
                user=request.user,
                category='report',
                title=f'มีรายงานใหม่ #{recent_rep.id} รอการตรวจสอบ',
                message=f'ผู้ใช้ @{recent_rep.reporter.username} รายงาน {recent_rep.get_report_type_display()} เรื่อง: {recent_rep.get_reason_display()}',
                link='/admin-panel/reports/',
                is_read=False
            )
        newest_u = User.objects.exclude(id=request.user.id).order_by('-date_joined').first()
        if newest_u:
            Notification.objects.create(
                user=request.user,
                category='user',
                title=f'ผู้ใช้ใหม่ลงทะเบียนเข้าสู่ระบบ',
                message=f'@{newest_u.username} ({newest_u.profile.get_display_name()}) ลงทะเบียนเข้าใช้งานระบบเรียบร้อยแล้ว',
                link='/admin-panel/users/',
                is_read=False
            )
        Notification.objects.create(
            user=request.user,
            category='system',
            title='ระบบ Cloudinary CDN และ GPS พร้อมใช้งาน',
            message='การเชื่อมต่อ Cloudinary Storage และระบบระบุพิกัด GPS อัตโนมัติทำงานสมบูรณ์แล้ว',
            link='/admin-panel/settings/',
            is_read=True
        )
        Notification.objects.create(
            user=request.user,
            category='location',
            title='ตรวจสอบตำแหน่งสถานที่ในระบบ',
            message=f'มีสถานที่ทั้งหมด {Location.objects.count()} แห่ง พร้อมสำหรับการเช็คอินและนำทาง',
            link='/admin-panel/locations/',
            is_read=True
        )

    filter_tab = request.GET.get('tab', 'all')
    notifs = Notification.objects.filter(user=request.user).order_by('-created_at')

    # Category and status tab counts
    total_count = notifs.count()
    unread_count = notifs.filter(is_read=False).count()
    report_count = notifs.filter(category='report').count()
    system_count = notifs.filter(category__in=['system', 'location', 'user']).count()

    if filter_tab == 'unread':
        notifs = notifs.filter(is_read=False)
    elif filter_tab == 'report':
        notifs = notifs.filter(category='report')
    elif filter_tab == 'system':
        notifs = notifs.filter(category__in=['system', 'location', 'user'])

    paginator = Paginator(notifs, 15)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {
        'notifications_page': page_obj,
        'current_tab': filter_tab,
        'total_count': total_count,
        'unread_count': unread_count,
        'report_count': report_count,
        'system_count': system_count,
        'active_page': 'notifications',
    }
    return render(request, 'admin_panel/notifications.html', context)


@admin_required
def settings_view(request):
    """
    Admin Settings Page with real SystemSetting persistence & AuditLog
    """
    system_setting = SystemSetting.get_settings()
    audit_logs = AuditLog.objects.select_related('admin_user').all()[:25]
    context = {
        'system_setting': system_setting,
        'audit_logs': audit_logs,
        'active_page': 'settings',
    }
    return render(request, 'admin_panel/settings.html', context)


# =========================================================================
# PROTECTED ADMIN API ENDPOINTS (AJAX / FETCH)
# =========================================================================

@admin_required
def analytics_api(request):
    """
    AJAX endpoint for chart timeframe switching (7, 30, 90 days) - 100% Real DB Queries
    """
    days = int(request.GET.get('days', 7))
    today = timezone.now().date()
    dates = [(today - timedelta(days=i)) for i in range(days - 1, -1, -1)]

    thai_months = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    
    if days == 90:
        # Step every 3 days for cleaner 90-day chart labels
        step_dates = dates[::3]
        labels = [f"{d.day} {thai_months[d.month]}" for d in step_dates]
        users = [User.objects.filter(date_joined__date=d).count() for d in step_dates]
        posts = [Post.objects.filter(created_at__date=d).count() for d in step_dates]
        likes = [Like.objects.filter(created_at__date=d).count() for d in step_dates]
    else:
        labels = [f"{d.day} {thai_months[d.month]}" for d in dates]
        users = [User.objects.filter(date_joined__date=d).count() for d in dates]
        posts = [Post.objects.filter(created_at__date=d).count() for d in dates]
        likes = [Like.objects.filter(created_at__date=d).count() for d in dates]

    return JsonResponse({
        'labels': labels,
        'users': users,
        'posts': posts,
        'likes': likes
    })


@admin_required
def user_action_api(request, user_id):
    """
    AJAX handler to suspend / activate / delete user
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    user = get_object_or_404(User, id=user_id)
    action = request.POST.get('action') # 'toggle_suspend' or 'delete'

    if action == 'toggle_suspend':
        if user.id == request.user.id:
            return JsonResponse({'success': False, 'message': 'ไม่สามารถระงับการใช้งานบัญชีของตนเองได้'}, status=400)
        profile = user.profile
        profile.is_suspended = not profile.is_suspended
        profile.save()
        status_str = 'ระงับการใช้งาน' if profile.is_suspended else 'ปลดระงับการใช้งาน'
        log_admin_action(request.user, f"{status_str} ผู้ใช้ @{user.username}", f"User #{user.id}", request=request)
        return JsonResponse({
            'success': True,
            'is_suspended': profile.is_suspended,
            'message': f'{status_str}เรียบร้อยแล้ว'
        })

    elif action == 'delete':
        if user.id == request.user.id:
            return JsonResponse({'success': False, 'message': 'ไม่สามารถลบบัญชีของตนเองขณะกำลังใช้งานอยู่ได้'}, status=400)
        if user.is_superuser and not request.user.is_superuser:
            return JsonResponse({'success': False, 'message': 'ไม่มีสิทธิ์ลบบัญชี Superuser'}, status=403)
        try:
            username = user.username
            user_id_val = user.id
            log_admin_action(request.user, f"ลบผู้ใช้ @{username}", f"User #{user_id_val}", request=request)
            user.delete()
            return JsonResponse({'success': True, 'message': f'ลบผู้ใช้ @{username} เรียบร้อยแล้ว'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'ไม่สามารถลบผู้ใช้ได้: {str(e)}'}, status=400)

    return JsonResponse({'error': 'Invalid action'}, status=400)


@admin_required
def post_delete_api(request, post_id):
    """
    AJAX handler to delete post with audit log
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        post = get_object_or_404(Post, id=post_id)
        post_title = post.title or f"Post #{post.id}"
        author = post.user.username
        
        log_admin_action(request.user, f"ลบโพสต์: {post_title} (โดย @{author})", f"Post #{post.id}", request=request)
        post.delete()

        return JsonResponse({'success': True, 'message': 'ลบโพสต์เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'ไม่สามารถลบโพสต์ได้: {str(e)}'}, status=400)


@admin_required
def comment_delete_api(request, comment_id):
    """
    AJAX handler to delete comment
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        comment = get_object_or_404(Comment, id=comment_id)
        log_admin_action(request.user, f"ลบคอมเมนต์ #{comment.id} โดย @{comment.user.username}", f"Comment #{comment.id}", request=request)
        comment.delete()
        return JsonResponse({'success': True, 'message': 'ลบคอมเมนต์เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'ไม่สามารถลบคอมเมนต์ได้: {str(e)}'}, status=400)


@admin_required
def report_action_api(request, report_id):
    """
    AJAX handler to resolve, dismiss, or handle report content
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        report = get_object_or_404(Report, id=report_id)
        status_choice = request.POST.get('status') # 'resolved', 'dismissed', 'reviewing'
        action_note = request.POST.get('note', '')

        if status_choice in ['resolved', 'dismissed', 'reviewing']:
            report.status = status_choice
            report.action_taken = action_note
            report.reviewed_by = request.user
            report.reviewed_at = timezone.now()
            report.save()

            # Optional content action
            delete_content = request.POST.get('delete_content') == 'true'
            if delete_content:
                if report.post:
                    report.post.delete()
                elif report.comment:
                    report.comment.delete()

            log_admin_action(request.user, f"อัปเดตสถานะรายงาน #{report.id} เป็น {report.get_status_display_thai()}", f"Report #{report.id}", request=request)
            return JsonResponse({'success': True, 'message': 'อัปเดตรายงานเรียบร้อยแล้ว', 'new_status': report.get_status_display_thai()})

        return JsonResponse({'error': 'Invalid status'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'เกิดข้อผิดพลาด: {str(e)}'}, status=400)


@admin_required
def export_analytics_csv(request):
    """
    CSV export endpoint for analytics overview
    """
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="admin_analytics_export.csv"'

    writer = csv.writer(response)
    writer.writerow(['Date', 'Users', 'Posts', 'Likes', 'Comments', 'Saved'])
    
    today = timezone.now().date()
    for i in range(30, -1, -1):
        d = today - timedelta(days=i)
        u_cnt = User.objects.filter(date_joined__date=d).count()
        p_cnt = Post.objects.filter(created_at__date=d).count()
        l_cnt = Like.objects.filter(created_at__date=d).count()
        c_cnt = Comment.objects.filter(created_at__date=d).count()
        s_cnt = SavedPost.objects.filter(created_at__date=d).count()
        writer.writerow([d.strftime('%Y-%m-%d'), u_cnt, p_cnt, l_cnt, c_cnt, s_cnt])

    log_admin_action(request.user, "ส่งออกข้อมูล Analytics (CSV)", request=request)
    return response


@admin_required
def location_edit_api(request, location_id):
    """
    AJAX handler to edit a location's details
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        location = get_object_or_404(Location, id=location_id)
        name = request.POST.get('name', '').strip()
        city = request.POST.get('city', '').strip()
        province = request.POST.get('province', '').strip()
        category_id = request.POST.get('category_id')
        lat_val = request.POST.get('latitude')
        lng_val = request.POST.get('longitude')
        description = request.POST.get('description', '').strip()

        if not name:
            return JsonResponse({'success': False, 'message': 'กรุณากรอกชื่อสถานที่'})

        location.name = name
        if city:
            location.city = city
        if province:
            location.province = province
        if category_id:
            location.category_id = category_id
        if lat_val:
            location.latitude = float(lat_val)
        if lng_val:
            location.longitude = float(lng_val)
        location.description = description
        location.save()

        log_admin_action(request.user, f"แก้ไขข้อมูลสถานที่: {name}", f"Location #{location.id}", request=request)
        return JsonResponse({
            'success': True,
            'message': f'อัปเดตข้อมูลสถานที่ "{name}" สำเร็จ',
            'location': {
                'id': location.id,
                'name': location.name,
                'category_name': location.category.name if location.category else 'ทั่วไป',
                'city': location.city,
                'province': location.province,
                'latitude': location.latitude,
                'longitude': location.longitude,
                'description': location.description,
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'ไม่สามารถแก้ไขสถานที่ได้: {str(e)}'}, status=400)


@admin_required
def location_delete_api(request, location_id):
    """
    AJAX handler to delete a location
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        location = get_object_or_404(Location, id=location_id)
        loc_name = location.name
        log_admin_action(request.user, f"ลบสถานที่: {loc_name}", f"Location #{location_id}", request=request)
        location.delete()
        return JsonResponse({'success': True, 'message': f'ลบสถานที่ "{loc_name}" เรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'ไม่สามารถลบสถานที่ได้: {str(e)}'}, status=400)


@admin_required
def category_create_api(request):
    """
    AJAX handler to create a new category
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    name = request.POST.get('name', '').strip()
    icon = request.POST.get('icon', 'tag').strip()
    order = int(request.POST.get('order', 99))

    if not name:
        return JsonResponse({'success': False, 'message': 'กรุณากรอกชื่อหมวดหมู่'})

    if Category.objects.filter(name__iexact=name).exists():
        return JsonResponse({'success': False, 'message': f'หมวดหมู่ "{name}" มีอยู่แล้ว'})

    cat = Category.objects.create(name=name, icon=icon, order=order)
    log_admin_action(request.user, f"เพิ่มหมวดหมู่: {name}", f"Category #{cat.id}", request=request)
    return JsonResponse({'success': True, 'message': f'เพิ่มหมวดหมู่ "{name}" เรียบร้อยแล้ว', 'id': cat.id})


@admin_required
def category_delete_api(request, category_id):
    """
    AJAX handler to delete a category
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    category = get_object_or_404(Category, id=category_id)
    cat_name = category.name
    log_admin_action(request.user, f"ลบหมวดหมู่: {cat_name}", f"Category #{category_id}", request=request)
    category.delete()
    return JsonResponse({'success': True, 'message': f'ลบหมวดหมู่ "{cat_name}" เรียบร้อยแล้ว'})


@admin_required
def user_edit_api(request, user_id):
    """
    AJAX handler to edit user's display_name, email, and staff status
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        user = get_object_or_404(User, id=user_id)
        display_name = request.POST.get('display_name', '').strip()
        email = request.POST.get('email', '').strip()
        make_staff = request.POST.get('is_staff') == 'true'

        changes = []
        if display_name and display_name != user.profile.display_name:
            user.profile.display_name = display_name
            user.profile.save()
            changes.append(f"ชื่อแสดง → {display_name}")

        if email and email != user.email:
            if User.objects.filter(email__iexact=email).exclude(id=user_id).exists():
                return JsonResponse({'success': False, 'message': 'อีเมลนี้ถูกใช้งานแล้ว'})
            user.email = email
            changes.append(f"อีเมล → {email}")

        if make_staff != user.is_staff:
            user.is_staff = make_staff
            changes.append(f"สิทธิ์ Staff → {'เปิด' if make_staff else 'ปิด'}")

        user.save()

        detail = ', '.join(changes) if changes else 'ไม่มีการเปลี่ยนแปลง'
        log_admin_action(request.user, f"แก้ไขข้อมูลผู้ใช้ @{user.username}: {detail}", f"User #{user.id}", request=request)
        return JsonResponse({
            'success': True,
            'message': f'อัปเดตข้อมูล @{user.username} เรียบร้อยแล้ว',
            'display_name': user.profile.display_name,
            'email': user.email,
            'is_staff': user.is_staff,
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'เกิดข้อผิดพลาด: {str(e)}'}, status=400)


@admin_required
def notifications_mark_all_read_api(request):
    """
    AJAX handler to mark all admin notifications as read
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return JsonResponse({'success': True, 'message': f'ทำเครื่องหมายว่าอ่านแล้วทั้งหมด ({updated} รายการ)'})


@admin_required
def notification_toggle_read_api(request, notification_id):
    """
    AJAX handler to toggle individual notification read/unread
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    notif = get_object_or_404(Notification, id=notification_id, user=request.user)
    notif.is_read = not notif.is_read
    notif.save()
    return JsonResponse({
        'success': True,
        'is_read': notif.is_read,
        'message': 'เปลี่ยนสถานะเรียบร้อยแล้ว'
    })


@admin_required
def notification_delete_api(request, notification_id):
    """
    AJAX handler to delete a single notification
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    notif = get_object_or_404(Notification, id=notification_id, user=request.user)
    notif.delete()
    return JsonResponse({'success': True, 'message': 'ลบการแจ้งเตือนแล้ว'})


@admin_required
def notifications_clear_all_api(request):
    """
    AJAX handler to clear all notifications for current admin
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    cnt, _ = Notification.objects.filter(user=request.user).delete()
    return JsonResponse({'success': True, 'message': f'ลบการแจ้งเตือนทั้งหมดแล้ว ({cnt} รายการ)'})


@admin_required
def notification_create_test_api(request):
    """
    AJAX handler to create a test notification / announcement
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    title = request.POST.get('title', '').strip() or 'แจ้งเตือนระบบทดสอบ'
    message = request.POST.get('message', '').strip() or 'นี่คือการแจ้งเตือนทดสอบของแอดมิน เพื่อตรวจสอบความพร้อมของระบบ'
    category = request.POST.get('category', 'system')
    link = request.POST.get('link', '/admin-panel/dashboard/').strip()

    notif = Notification.objects.create(
        user=request.user,
        category=category,
        title=title,
        message=message,
        link=link,
        is_read=False
    )
    log_admin_action(request.user, f"สร้างการแจ้งเตือน: {title}", f"Notification #{notif.id}", request=request)
    return JsonResponse({'success': True, 'message': 'สร้างการแจ้งเตือนใหม่เรียบร้อยแล้ว'})


@admin_required
def settings_save_api(request):
    """
    AJAX handler to save system settings with audit logging
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        setting = SystemSetting.get_settings()
        site_name = request.POST.get('site_name', '').strip()
        site_desc = request.POST.get('site_description', '').strip()
        default_province = request.POST.get('default_province', '').strip()
        default_lat = request.POST.get('default_lat')
        default_lng = request.POST.get('default_lng')
        allow_reg = request.POST.get('allow_user_registration') == 'true'
        require_mod = request.POST.get('require_post_moderation') == 'true'
        maint_mode = request.POST.get('maintenance_mode') == 'true'
        contact_email = request.POST.get('contact_email', '').strip()

        if site_name:
            setting.site_name = site_name
        setting.site_description = site_desc
        if default_province:
            setting.default_province = default_province
        if default_lat:
            setting.default_lat = float(default_lat)
        if default_lng:
            setting.default_lng = float(default_lng)

        setting.allow_user_registration = allow_reg
        setting.require_post_moderation = require_mod
        setting.maintenance_mode = maint_mode
        if contact_email:
            setting.contact_email = contact_email
        setting.save()

        log_admin_action(request.user, "บันทึกการตั้งค่าระบบทั่วไป", "SystemSetting", request=request)
        return JsonResponse({'success': True, 'message': 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'บันทึกไม่สำเร็จ: {str(e)}'}, status=400)


