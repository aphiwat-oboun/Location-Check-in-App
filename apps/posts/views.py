from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from apps.locations.models import Location, Category
from .models import Post, PostImage

def post_detail_view(request, pk):
    post = get_object_or_404(Post.objects.select_related('user', 'user__profile', 'location', 'category'), pk=pk)
    comments = post.comments.select_related('user', 'user__profile').order_by('created_at')
    related_posts = Post.objects.filter(location=post.location).exclude(pk=post.pk)[:6]
    
    is_liked = post.is_liked_by(request.user)
    is_saved = post.is_saved_by(request.user)
    
    context = {
        'post': post,
        'comments': comments,
        'related_posts': related_posts,
        'is_liked': is_liked,
        'is_saved': is_saved,
    }
    return render(request, 'posts/detail.html', context)

import base64
import uuid
from django.core.files.base import ContentFile

@login_required
def create_post_view(request):
    """Multi-step Create Post Flow matching reference screens 4-7"""
    categories = Category.objects.all()
    user = request.user
    if request.method == 'POST':
        try:
            place_name = request.POST.get('place_name', '').strip()
            description = request.POST.get('description', '').strip()
            category_id = request.POST.get('category')
            city = request.POST.get('city', 'เมืองศรีสะเกษ').strip()
            
            try:
                lat = float(request.POST.get('lat') or 15.1120)
            except (ValueError, TypeError):
                lat = 15.1120

            try:
                lng = float(request.POST.get('lng') or 104.3180)
            except (ValueError, TypeError):
                lng = 104.3180

            image_file = request.FILES.get('image')
            image_url = request.POST.get('image_url', '').strip()

            # Handle Base64 data URL if sent from frontend canvas/camera
            if not image_file and image_url and image_url.startswith('data:image'):
                try:
                    format_part, imgstr = image_url.split(';base64,')
                    ext = format_part.split('/')[-1].split(';')[0]
                    if ext.lower() == 'jpeg':
                        ext = 'jpg'
                    image_file = ContentFile(base64.b64decode(imgstr), name=f"post_{uuid.uuid4().hex[:8]}.{ext}")
                except Exception:
                    image_file = None
                image_url = ''

            # Ensure image_url is an actual HTTP/HTTPS link and not an invalid or overly long string
            if image_url and not (image_url.startswith('http://') or image_url.startswith('https://')):
                image_url = ''
            elif image_url:
                image_url = image_url[:490]

            if not place_name:
                place_name = 'สถานที่ท่องเที่ยว'

            # Get or create location
            category_obj = Category.objects.filter(id=category_id).first() if category_id else Category.objects.first()
            location, created = Location.objects.get_or_create(
                name=place_name,
                defaults={
                    'city': city or 'เมืองศรีสะเกษ',
                    'province': 'ศรีสะเกษ',
                    'latitude': lat,
                    'longitude': lng,
                    'category': category_obj,
                    'created_by': user,
                    'description': description,
                }
            )

            # Create post with fallback if file storage fails (e.g. read-only filesystem without Cloudinary)
            try:
                post = Post.objects.create(
                    user=user,
                    location=location,
                    category=category_obj,
                    caption=description,
                    cover_image=image_file if image_file else None,
                    cover_image_url=image_url if not image_file else None,
                    cached_likes_count=0,
                    cached_comments_count=0
                )
            except OSError:
                post = Post.objects.create(
                    user=user,
                    location=location,
                    category=category_obj,
                    caption=description,
                    cover_image=None,
                    cover_image_url=image_url or "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
                    cached_likes_count=0,
                    cached_comments_count=0
                )
            
            # If location didn't have cover image, update it safely
            try:
                if not location.cover_image and not location.cover_image_url:
                    if image_file and post.cover_image:
                        location.cover_image = post.cover_image
                    elif image_url:
                        location.cover_image_url = image_url
                    location.save()
            except Exception:
                pass

            messages.success(request, 'แชร์เรื่องราวและรูปภาพของคุณเรียบร้อยแล้ว!')
            return redirect('posts:detail', pk=post.pk)

        except Exception as e:
            messages.error(request, f'เกิดข้อผิดพลาดในการบันทึกโพสต์: {str(e)}')
            return redirect('posts:create')

    context = {
        'categories': categories,
        'default_lat': 15.1120,
        'default_lng': 104.3180,
    }
    return render(request, 'posts/create.html', context)

@login_required
def my_posts_view(request):
    posts = request.user.posts.select_related('location', 'category').order_by('-created_at')
    return render(request, 'posts/my_posts.html', {'posts': posts})

@login_required
def edit_post_view(request, pk):
    post = get_object_or_404(Post.objects.select_related('location', 'category'), pk=pk)
    if post.user != request.user and not request.user.is_staff:
        messages.error(request, 'คุณไม่มีสิทธิ์แก้ไขโพสต์นี้')
        return redirect('posts:detail', pk=pk)
        
    categories = Category.objects.all()
    
    if request.method == 'POST':
        caption = request.POST.get('caption', '').strip()
        category_id = request.POST.get('category')
        place_name = request.POST.get('place_name', '').strip()
        image_file = request.FILES.get('image')
        
        post.caption = caption
        if category_id:
            category_obj = Category.objects.filter(id=category_id).first()
            if category_obj:
                post.category = category_obj
                
        if image_file:
            post.cover_image = image_file
            
        if place_name and post.location:
            post.location.name = place_name
            post.location.save()
            
        post.save()
        messages.success(request, 'บันทึกการแก้ไขโพสต์เรียบร้อยแล้ว!')
        return redirect('posts:detail', pk=post.pk)
        
    context = {
        'post': post,
        'categories': categories,
    }
    return render(request, 'posts/edit.html', context)

@login_required
def delete_post_view(request, pk):
    post = get_object_or_404(Post, pk=pk)
    if post.user != request.user and not request.user.is_staff:
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'error': 'forbidden', 'message': 'คุณไม่มีสิทธิ์ลบโพสต์นี้'}, status=403)
        messages.error(request, 'คุณไม่มีสิทธิ์ลบโพสต์นี้')
        return redirect('posts:detail', pk=pk)
        
    post.delete()
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest' or request.method == 'DELETE':
        return JsonResponse({'status': 'ok', 'message': 'ลบโพสต์เรียบร้อยแล้ว'})
        
    messages.success(request, 'ลบโพสต์ของคุณเรียบร้อยแล้ว')
    return redirect('core:home')
