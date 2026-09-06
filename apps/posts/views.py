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

            # Collect all uploaded images (supports unlimited images)
            all_images = []
            
            # 1. From file inputs (multiple files)
            files = request.FILES.getlist('images')
            if not files:
                files = request.FILES.getlist('image')
            for f in files:
                if f:
                    all_images.append({'type': 'file', 'data': f})

            # 2. From Base64 data URLs / camera snaps
            raw_urls = request.POST.getlist('image_urls')
            single_url = request.POST.get('image_url', '').strip()
            if single_url and single_url not in raw_urls:
                raw_urls.append(single_url)

            for u_str in raw_urls:
                u_str = u_str.strip()
                if not u_str:
                    continue
                if u_str.startswith('data:image'):
                    try:
                        format_part, imgstr = u_str.split(';base64,')
                        ext = format_part.split('/')[-1].split(';')[0]
                        if ext.lower() == 'jpeg':
                            ext = 'jpg'
                        c_file = ContentFile(base64.b64decode(imgstr), name=f"post_{uuid.uuid4().hex[:8]}.{ext}")
                        all_images.append({'type': 'file', 'data': c_file})
                    except Exception:
                        pass
                elif u_str.startswith('http://') or u_str.startswith('https://'):
                    all_images.append({'type': 'url', 'data': u_str[:490]})

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

            # Determine first cover image
            first_img_file = None
            first_img_url = None
            if all_images:
                if all_images[0]['type'] == 'file':
                    first_img_file = all_images[0]['data']
                else:
                    first_img_url = all_images[0]['data']

            # Create post
            try:
                post = Post.objects.create(
                    user=user,
                    location=location,
                    category=category_obj,
                    caption=description,
                    cover_image=first_img_file,
                    cover_image_url=first_img_url if not first_img_file else None,
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
                    cover_image_url=first_img_url or "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
                    cached_likes_count=0,
                    cached_comments_count=0
                )

            # Save all images to PostImage records
            for idx, item in enumerate(all_images):
                try:
                    if item['type'] == 'file':
                        PostImage.objects.create(
                            post=post,
                            image=item['data'],
                            order=idx
                        )
                    elif item['type'] == 'url':
                        PostImage.objects.create(
                            post=post,
                            image_url=item['data'],
                            order=idx
                        )
                except Exception as img_err:
                    print(f"Error saving PostImage {idx}: {img_err}")
            
            # If location didn't have cover image, update it safely
            try:
                if not location.cover_image and not location.cover_image_url:
                    if post.cover_image:
                        location.cover_image = post.cover_image
                    elif post.cover_image_url:
                        location.cover_image_url = post.cover_image_url
                    location.save()
            except Exception:
                pass

            messages.success(request, f'แชร์เรื่องราวและรูปภาพ ({len(all_images)} รูป) ของคุณเรียบร้อยแล้ว!')
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
    posts = request.user.posts.select_related('location', 'category').prefetch_related('images').order_by('-created_at')
    return render(request, 'posts/my_posts.html', {'posts': posts})

@login_required
def edit_post_view(request, pk):
    post = get_object_or_404(Post.objects.select_related('location', 'category').prefetch_related('images'), pk=pk)
    if post.user != request.user and not request.user.is_staff:
        messages.error(request, 'คุณไม่มีสิทธิ์แก้ไขโพสต์นี้')
        return redirect('posts:detail', pk=pk)
        
    categories = Category.objects.all()
    
    if request.method == 'POST':
        caption = request.POST.get('caption', '').strip()
        category_id = request.POST.get('category')
        place_name = request.POST.get('place_name', '').strip()
        
        # Additional new images
        new_files = request.FILES.getlist('images') or request.FILES.getlist('image')
        delete_image_ids = request.POST.getlist('delete_images')
        
        # Delete selected images
        if delete_image_ids:
            PostImage.objects.filter(post=post, id__in=delete_image_ids).delete()
            
        post.caption = caption
        if category_id:
            category_obj = Category.objects.filter(id=category_id).first()
            if category_obj:
                post.category = category_obj
                
        # Add new images
        current_max_order = post.images.count()
        for idx, nf in enumerate(new_files):
            if nf:
                PostImage.objects.create(
                    post=post,
                    image=nf,
                    order=current_max_order + idx
                )
                
        # Update cover image if none or requested
        first_img = post.images.first()
        if first_img:
            if first_img.image:
                post.cover_image = first_img.image
            elif first_img.image_url:
                post.cover_image_url = first_img.image_url
            
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
