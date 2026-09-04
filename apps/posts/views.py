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

def create_post_view(request):
    """Multi-step Create Post Flow matching reference screens 4-7"""
    categories = Category.objects.all()
    
    if request.method == 'POST':
        # If user is not authenticated, let's create or use demo user for frictionless experience
        user = request.user
        if not user.is_authenticated:
            from django.contrib.auth.models import User
            user = User.objects.first()
            if not user:
                user = User.objects.create_user(username='arin_demo', first_name='อารินทร์')
                
        place_name = request.POST.get('place_name', '').strip()
        description = request.POST.get('description', '').strip()
        category_id = request.POST.get('category')
        city = request.POST.get('city', 'เมืองศรีสะเกษ').strip()
        lat = float(request.POST.get('lat', 15.1120))
        lng = float(request.POST.get('lng', 104.3180))
        image_file = request.FILES.get('image')
        image_url = request.POST.get('image_url', '').strip()

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
        
        # If location didn't have cover image, update it
        if not location.cover_image and not location.cover_image_url:
            if image_file:
                location.cover_image = image_file
            elif image_url:
                location.cover_image_url = image_url
            location.save()

        messages.success(request, 'แชร์เรื่องราวและรูปภาพของคุณเรียบร้อยแล้ว!')
        return redirect('posts:detail', pk=post.pk)

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
