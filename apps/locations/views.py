from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.db.models import Q
from .models import Location, Category

def location_detail_view(request, pk):
    location = get_object_or_404(Location, pk=pk)
    posts = location.posts.filter(is_published=True).select_related('user', 'user__profile').order_by('-created_at')
    
    context = {
        'location': location,
        'posts': posts,
        'post_count': location.get_post_count(),
        'photo_count': location.get_photo_count(),
    }
    return render(request, 'locations/detail.html', context)

def api_locations(request):
    """API endpoint for Leaflet photo markers"""
    category_slug = request.GET.get('category')
    filter_type = request.GET.get('filter') # near, popular, new
    query = request.GET.get('q', '').strip()

    locations = Location.objects.all().prefetch_related('posts', 'posts__user', 'posts__user__profile')
    
    if category_slug:
        locations = locations.filter(category__slug=category_slug)
    if query:
        locations = locations.filter(Q(name__icontains=query) | Q(city__icontains=query) | Q(description__icontains=query))
    if filter_type == 'popular':
        locations = locations.order_by('-cached_post_count')
    elif filter_type == 'new':
        locations = locations.order_by('-created_at')

    data = []
    for loc in locations:
        latest_post = loc.posts.filter(is_published=True).first()
        latest_post_data = None
        if latest_post:
            latest_post_data = {
                'id': latest_post.id,
                'author_name': latest_post.user.profile.get_display_name() if hasattr(latest_post.user, 'profile') else latest_post.user.username,
                'author_avatar': latest_post.user.profile.get_avatar_url() if hasattr(latest_post.user, 'profile') else '',
                'caption': latest_post.caption,
                'time_ago': latest_post.get_time_ago_str(),
                'likes_count': latest_post.get_likes_count(),
                'comments_count': latest_post.get_comments_count(),
                'cover_url': latest_post.get_cover_url()
            }
        else:
            latest_post_data = {
                'id': None,
                'author_name': 'ที่นี่มีอะไร?',
                'author_avatar': 'https://ui-avatars.com/api/?name=W&background=159F8C&color=fff',
                'caption': loc.description or 'สถานที่น่าค้นหา',
                'time_ago': 'เมื่อสักครู่',
                'likes_count': 12,
                'comments_count': 3,
                'cover_url': loc.get_cover_url()
            }
            
        data.append({
            'id': loc.id,
            'name': loc.name,
            'city': loc.city,
            'province': loc.province,
            'lat': loc.latitude,
            'lng': loc.longitude,
            'distance_km': loc.distance_km,
            'cover_url': loc.get_cover_url(),
            'post_count': loc.get_post_count(),
            'photo_count': loc.get_photo_count(),
            'category': loc.category.name if loc.category else 'ทั่วไป',
            'latest_post': latest_post_data,
            'detail_url': f"/locations/{loc.id}/",
        })
        
    return JsonResponse({'locations': data})
