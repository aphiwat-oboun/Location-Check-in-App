from django.shortcuts import render
from django.db.models import Q
from apps.locations.models import Location, Category
from apps.posts.models import Post
from apps.interactions.models import Like, SavedPost

def home_view(request):
    """Desktop Split view + Mobile Feed matching reference UI"""
    filter_type = request.GET.get('filter', 'near')
    category_slug = request.GET.get('category')
    search_query = request.GET.get('q', '').strip()
    
    # 3 Recommended Places (Matching Reference Image)
    recommended_places = Location.objects.filter(is_featured=True)[:3]
    if not recommended_places.exists():
        recommended_places = Location.objects.all()[:3]
        
    # Recent Posts
    recent_posts_qs = Post.objects.filter(is_published=True).select_related('user', 'user__profile', 'location', 'category')
    
    if search_query:
        recent_posts_qs = recent_posts_qs.filter(
            Q(location__name__icontains=search_query) |
            Q(location__city__icontains=search_query) |
            Q(caption__icontains=search_query) |
            Q(user__username__icontains=search_query)
        )
    if category_slug:
        recent_posts_qs = recent_posts_qs.filter(category__slug=category_slug)
        
    if filter_type == 'popular':
        recent_posts = recent_posts_qs.order_by('-cached_likes_count', '-created_at')[:10]
    elif filter_type == 'new':
        recent_posts = recent_posts_qs.order_by('-created_at')[:10]
    else: # near
        recent_posts = recent_posts_qs.order_by('-created_at')[:10]

    recent_posts = list(recent_posts)
    if request.user.is_authenticated:
        user_liked_ids = set(Like.objects.filter(user=request.user, post__in=recent_posts).values_list('post_id', flat=True))
        user_saved_ids = set(SavedPost.objects.filter(user=request.user, post__in=recent_posts).values_list('post_id', flat=True))
        for p in recent_posts:
            p.is_liked = p.id in user_liked_ids
            p.is_saved = p.id in user_saved_ids

    # Locations for Leaflet Map
    all_locations = Location.objects.all()
    
    # Selected location for initial desktop map card (Cafe in the garden)
    selected_location = Location.objects.filter(name__icontains='สมเด็จ').first() or Location.objects.first()

    context = {
        'recommended_places': recommended_places,
        'recent_posts': recent_posts,
        'all_locations': all_locations,
        'selected_location': selected_location,
        'filter_type': filter_type,
        'search_query': search_query,
        'active_nav': 'home',
    }
    return render(request, 'core/home.html', context)

def explore_view(request):
    """Mobile Explore View matching Reference Image Screen 2"""
    filter_type = request.GET.get('filter', 'near')
    category_slug = request.GET.get('category')
    search_query = request.GET.get('q', '').strip()
    
    locations = Location.objects.all()
    if search_query:
        locations = locations.filter(Q(name__icontains=search_query) | Q(city__icontains=search_query))
    if category_slug:
        locations = locations.filter(category__slug=category_slug)
        
    if filter_type == 'popular':
        locations = locations.order_by('-cached_post_count')
    elif filter_type == 'new':
        locations = locations.order_by('-created_at')
    else:
        locations = locations.order_by('order', '-created_at')

    context = {
        'locations': locations,
        'filter_type': filter_type,
        'search_query': search_query,
        'active_nav': 'explore',
    }
    return render(request, 'core/explore.html', context)

def map_view(request):
    """Mobile Map View matching Reference Image Screen 3"""
    all_locations = Location.objects.all()
    selected_location = Location.objects.filter(name__icontains='สมเด็จ').first() or Location.objects.first()

    context = {
        'all_locations': all_locations,
        'selected_location': selected_location,
        'active_nav': 'map',
    }
    return render(request, 'core/map_view.html', context)

def welcome_view(request):
    """Mobile Welcome View matching Reference Image Screen 1"""
    return render(request, 'core/welcome.html')

def saved_places_view(request):
    """Saved places view"""
    if request.user.is_authenticated:
        saved_items = request.user.saved_posts.select_related('post', 'post__location').order_by('-created_at')
    else:
        saved_items = []
    return render(request, 'core/saved.html', {'saved_items': saved_items, 'active_nav': 'saved'})
