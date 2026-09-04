from django.shortcuts import get_object_or_404, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.contrib.auth.decorators import login_required
from apps.posts.models import Post
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
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'unauthorized', 'message': 'กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น'}, status=401)
        
    post = get_object_or_404(Post, pk=post_id)
    content = request.POST.get('content', '').strip()
    parent_id = request.POST.get('parent_id')
    
    if not content:
        return JsonResponse({'error': 'invalid', 'message': 'กรุณากรอกข้อความความคิดเห็น'}, status=400)
        
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

    author_name = request.user.profile.get_display_name() if hasattr(request.user, 'profile') else request.user.username
    author_avatar = request.user.profile.get_avatar_url() if hasattr(request.user, 'profile') else ''

    return JsonResponse({
        'id': comment.id,
        'parent_id': comment.parent_id,
        'author_name': author_name,
        'author_avatar': author_avatar,
        'content': comment.content,
        'created_at': 'เมื่อสักครู่',
        'comments_count': comments_count
    })

@require_GET
def list_comments_api(request, post_id):
    post = get_object_or_404(Post, pk=post_id)
    comments_qs = post.comments.filter(parent=None).select_related('user', 'user__profile').prefetch_related('replies', 'replies__user', 'replies__user__profile')
    
    comments_data = []
    for c in comments_qs:
        author_name = c.user.profile.get_display_name() if hasattr(c.user, 'profile') else c.user.username
        author_avatar = c.user.profile.get_avatar_url() if hasattr(c.user, 'profile') else ''
        
        replies_data = []
        for r in c.replies.all():
            r_author = r.user.profile.get_display_name() if hasattr(r.user, 'profile') else r.user.username
            r_avatar = r.user.profile.get_avatar_url() if hasattr(r.user, 'profile') else ''
            replies_data.append({
                'id': r.id,
                'author_name': r_author,
                'author_avatar': r_avatar,
                'content': r.content,
                'created_at': r.created_at.strftime('%d/%m/%Y %H:%M')
            })

        comments_data.append({
            'id': c.id,
            'author_name': author_name,
            'author_avatar': author_avatar,
            'content': c.content,
            'created_at': c.created_at.strftime('%d/%m/%Y %H:%M'),
            'replies': replies_data
        })

    return JsonResponse({
        'post_id': post.id,
        'comments_count': post.get_comments_count(),
        'comments': comments_data
    })

@login_required
@require_GET
def list_notifications_api(request):
    notifications_qs = Notification.objects.filter(recipient=request.user).select_related('actor', 'actor__profile', 'post')[:20]
    unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
    
    data = []
    for n in notifications_qs:
        actor_name = n.actor.profile.get_display_name() if hasattr(n.actor, 'profile') else n.actor.username
        actor_avatar = n.actor.profile.get_avatar_url() if hasattr(n.actor, 'profile') else ''
        data.append({
            'id': n.id,
            'actor_name': actor_name,
            'actor_avatar': actor_avatar,
            'notification_type': n.notification_type,
            'text': n.text,
            'post_id': n.post_id if n.post else None,
            'is_read': n.is_read,
            'created_at': n.created_at.strftime('%d/%m %H:%M')
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
