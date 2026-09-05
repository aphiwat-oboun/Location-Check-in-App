from django.shortcuts import get_object_or_404, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.contrib.auth.decorators import login_required
from django.utils.timezone import now
from apps.posts.models import Post
from apps.accounts.models import Follow
from .models import Like, SavedPost, Comment, Notification

@require_POST
def toggle_like_api(request, post_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'unauthorized', 'message': 'กรุณาเข้าสู่ระบบก่อนกดถูกใจ'}, status=401)
    
    post = get_object_or_404(Post, pk=post_id)
    like_obj = Like.objects.filter(user=request.user, post=post).first()
    
    if like_obj:
        like_obj.delete()
        liked = False
        # Remove notification if exists
        Notification.objects.filter(actor=request.user, post=post, notification_type='like').delete()
    else:
        Like.objects.create(user=request.user, post=post)
        liked = True
        # Create notification if liker is not the post author
        if post.user != request.user:
            Notification.objects.create(
                recipient=post.user,
                actor=request.user,
                notification_type='like',
                post=post,
                text=f'ได้กดถูกใจโพสต์ของคุณ "{post.location.name}"'
            )
            
    # Sync cached count
    likes_count = post.likes.count()
    post.cached_likes_count = likes_count
    post.save(update_fields=['cached_likes_count'])
        
    return JsonResponse({
        'liked': liked,
        'likes_count': likes_count
    })

@require_POST
def toggle_save_api(request, post_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'unauthorized', 'message': 'กรุณาเข้าสู่ระบบก่อนบันทึก'}, status=401)
        
    post = get_object_or_404(Post, pk=post_id)
    saved_obj = SavedPost.objects.filter(user=request.user, post=post).first()
    
    if saved_obj:
        saved_obj.delete()
        saved = False
    else:
        SavedPost.objects.create(user=request.user, post=post)
        saved = True
        
    return JsonResponse({
        'saved': saved
    })

@require_POST
def add_comment_view(request, post_id):
    is_ajax = (
        request.headers.get('x-requested-with') == 'XMLHttpRequest' or
        'application/json' in request.headers.get('accept', '') or
        request.content_type == 'application/json'
    )

    if not request.user.is_authenticated:
        if is_ajax:
            return JsonResponse({'error': 'unauthorized', 'message': 'กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น'}, status=401)
        from django.contrib import messages
        messages.error(request, 'กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น')
        return redirect('accounts:login')
        
    post = get_object_or_404(Post, pk=post_id)
    content = request.POST.get('content', '').strip()
    parent_id = request.POST.get('parent_id')
    
    if not content:
        if is_ajax:
            return JsonResponse({'error': 'invalid', 'message': 'กรุณากรอกข้อความความคิดเห็น'}, status=400)
        from django.contrib import messages
        messages.error(request, 'กรุณากรอกข้อความความคิดเห็น')
        return redirect(request.META.get('HTTP_REFERER') or 'core:home')
        
    parent_comment = None
    if parent_id:
        parent_comment = Comment.objects.filter(pk=parent_id, post=post).first()
        
    comment = Comment.objects.create(
        user=request.user,
        post=post,
        parent=parent_comment,
        content=content
    )

    # Sync cached count
    comments_count = post.comments.count()
    post.cached_comments_count = comments_count
    post.save(update_fields=['cached_comments_count'])

    # Create Notifications
    if parent_comment and parent_comment.user != request.user:
        # Reply Notification
        Notification.objects.create(
            recipient=parent_comment.user,
            actor=request.user,
            notification_type='reply',
            post=post,
            comment=comment,
            text=f'ตอบกลับความคิดเห็นของคุณ: "{content[:30]}"'
        )
    elif post.user != request.user:
        # Comment Notification
        Notification.objects.create(
            recipient=post.user,
            actor=request.user,
            notification_type='comment',
            post=post,
            comment=comment,
            text=f'แสดงความคิดเห็นบนโพสต์ของคุณ: "{content[:30]}"'
        )

    is_ajax = (
        request.headers.get('x-requested-with') == 'XMLHttpRequest' or
        'application/json' in request.headers.get('accept', '') or
        request.content_type == 'application/json'
    )

    author_name = request.user.profile.get_display_name() if hasattr(request.user, 'profile') else request.user.username
    author_avatar = request.user.profile.get_avatar_url() if hasattr(request.user, 'profile') else ''

    if is_ajax:
        return JsonResponse({
            'id': comment.id,
            'parent_id': comment.parent_id,
            'author_name': author_name,
            'author_avatar': author_avatar,
            'content': comment.content,
            'created_at': 'เมื่อสักครู่',
            'comments_count': comments_count
        })
    else:
        from django.contrib import messages
        messages.success(request, 'แสดงความคิดเห็นเรียบร้อยแล้ว')
        referer = request.META.get('HTTP_REFERER')
        if referer:
            return redirect(referer)
        return redirect('posts:detail', pk=post_id)

@require_GET
def list_comments_api(request, post_id):
    post = get_object_or_404(Post, pk=post_id)
    comments_qs = post.comments.filter(parent=None).select_related('user', 'user__profile').prefetch_related('replies', 'replies__user', 'replies__user__profile')
    
    current_user = request.user if request.user.is_authenticated else None
    
    comments_data = []
    for c in comments_qs:
        author_name = c.user.profile.get_display_name() if hasattr(c.user, 'profile') else c.user.username
        author_avatar = c.user.profile.get_avatar_url() if hasattr(c.user, 'profile') else ''
        can_delete = bool(current_user and (current_user.id == c.user_id or current_user.id == post.user_id or current_user.is_staff))
        
        replies_data = []
        for r in c.replies.all():
            r_author = r.user.profile.get_display_name() if hasattr(r.user, 'profile') else r.user.username
            r_avatar = r.user.profile.get_avatar_url() if hasattr(r.user, 'profile') else ''
            r_can_delete = bool(current_user and (current_user.id == r.user_id or current_user.id == post.user_id or current_user.is_staff))
            replies_data.append({
                'id': r.id,
                'author_name': r_author,
                'author_username': r.user.username,
                'author_avatar': r_avatar,
                'content': r.content,
                'created_at': r.created_at.strftime('%d/%m/%Y %H:%M'),
                'is_owner': r_can_delete
            })

        comments_data.append({
            'id': c.id,
            'author_name': author_name,
            'author_username': c.user.username,
            'author_avatar': author_avatar,
            'content': c.content,
            'created_at': c.created_at.strftime('%d/%m/%Y %H:%M'),
            'is_owner': can_delete,
            'replies': replies_data
        })

    return JsonResponse({
        'post_id': post.id,
        'comments_count': post.get_comments_count(),
        'comments': comments_data
    })

@require_POST
def delete_comment_api(request, comment_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'unauthorized', 'message': 'กรุณาเข้าสู่ระบบก่อนดำเนินการ'}, status=401)
        
    comment = get_object_or_404(Comment, pk=comment_id)
    post = comment.post
    
    # Allow deletion if user is comment author, post author, or staff
    if comment.user != request.user and post.user != request.user and not request.user.is_staff:
        return JsonResponse({'error': 'forbidden', 'message': 'คุณไม่มีสิทธิ์ลบความคิดเห็นนี้'}, status=403)
        
    comment.delete()
    post.cached_comments_count = post.comments.count()
    post.save(update_fields=['cached_comments_count'])
    
    return JsonResponse({
        'status': 'ok',
        'message': 'ลบความคิดเห็นเรียบร้อยแล้ว',
        'comments_count': post.cached_comments_count
    })

@login_required
@require_GET
def list_notifications_api(request):
    notifications_qs = Notification.objects.filter(recipient=request.user).select_related('actor', 'actor__profile', 'post')[:40]
    unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
    
    following_ids = set(Follow.objects.filter(follower=request.user).values_list('following_id', flat=True))
    
    current_time = now()
    data = []
    for n in notifications_qs:
        actor_name = n.actor.profile.get_display_name() if hasattr(n.actor, 'profile') else n.actor.username
        actor_avatar = n.actor.profile.get_avatar_url() if hasattr(n.actor, 'profile') else ''
        
        diff = current_time - n.created_at
        if diff.total_seconds() < 60:
            time_str = "เมื่อสักครู่"
        elif diff.total_seconds() < 3600:
            time_str = f"{int(diff.total_seconds() // 60)} นาที"
        elif diff.total_seconds() < 86400:
            time_str = f"{int(diff.total_seconds() // 3600)} ชั่วโมง"
        elif diff.days < 7:
            time_str = f"{diff.days} วัน"
        else:
            time_str = f"{diff.days // 7} สัปดาห์"

        is_new = (diff.total_seconds() < 86400) # Past 24 hours is "New"

        data.append({
            'id': n.id,
            'actor_name': actor_name,
            'actor_username': n.actor.username,
            'actor_avatar': actor_avatar,
            'actor_is_following': n.actor.id in following_ids,
            'notification_type': n.notification_type,
            'text': n.text,
            'post_id': n.post_id if n.post else None,
            'is_read': n.is_read,
            'is_new': is_new,
            'created_at': time_str
        })

    return JsonResponse({
        'unread_count': unread_count,
        'notifications': data
    })

@login_required
@require_POST
def mark_notifications_read_api(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return JsonResponse({'status': 'ok'})
