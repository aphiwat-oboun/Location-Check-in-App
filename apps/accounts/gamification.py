"""
Gamification & Luxury Badges Engine for Sisaket Check-in App
Computes real-time XP, explorer levels, category stats, and jewel-styled badges.
"""

from apps.posts.models import Post
from apps.interactions.models import Like, Comment

BADGE_DEFINITIONS = [
    {
        'id': 'first_step',
        'name': 'ก้าวแรกสู่นักเดินทาง',
        'subtitle': 'First Step Explorer',
        'tier': 'bronze',
        'icon': 'footprints',
        'svg_icon': '/static/icons/badges/badge-first_step.svg',
        'description': 'โพสต์เช็กอินสถานที่ท่องเที่ยวแรกของคุณ',
        'category': 'checkin',
        'target': 1,
        'gradient': 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #92400E 100%)',
        'border_glow': 'rgba(245, 158, 11, 0.45)',
        'text_color': '#FEF3C7',
    },
    {
        'id': 'local_scout',
        'name': 'นักสำรวจท้องถิ่น',
        'subtitle': 'Local Scout',
        'tier': 'silver',
        'icon': 'compass',
        'svg_icon': '/static/icons/badges/badge-local_scout.svg',
        'description': 'เช็กอินสถานที่ในศรีสะเกษครบ 3 แห่ง',
        'category': 'checkin',
        'target': 3,
        'gradient': 'linear-gradient(135deg, #94A3B8 0%, #64748B 50%, #334155 100%)',
        'border_glow': 'rgba(148, 163, 184, 0.45)',
        'text_color': '#F1F5F9',
    },
    {
        'id': 'pro_adventurer',
        'name': 'นักผจญภัยมือโปร',
        'subtitle': 'Pro Adventurer',
        'tier': 'gold',
        'icon': 'award',
        'svg_icon': '/static/icons/badges/badge-pro_adventurer.svg',
        'description': 'เช็กอินสถานที่ท่องเที่ยวครบ 7 แห่ง',
        'category': 'checkin',
        'target': 7,
        'gradient': 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 50%, #B45309 100%)',
        'border_glow': 'rgba(245, 158, 11, 0.65)',
        'text_color': '#FFFBEB',
    },
    {
        'id': 'sisaket_legend',
        'name': 'เจ้าถิ่นศรีสะเกษ',
        'subtitle': 'Sisaket Legend',
        'tier': 'diamond',
        'icon': 'crown',
        'svg_icon': '/static/icons/badges/badge-sisaket_legend.svg',
        'description': 'เช็กอินสถานที่ท่องเที่ยวครบ 15 แห่งอย่างสมบูรณ์แบบ',
        'category': 'checkin',
        'target': 15,
        'gradient': 'linear-gradient(135deg, #38BDF8 0%, #3B82F6 45%, #8B5CF6 100%)',
        'border_glow': 'rgba(56, 189, 248, 0.75)',
        'text_color': '#F0F9FF',
    },
    {
        'id': 'cafe_connoisseur',
        'name': 'คอกาแฟตัวจริง',
        'subtitle': 'Cafe Connoisseur',
        'tier': 'amber',
        'icon': 'coffee',
        'svg_icon': '/static/icons/badges/badge-cafe_connoisseur.svg',
        'description': 'เช็กอินคาเฟ่และร้านอาหารครบ 3 แห่ง',
        'category': 'cafe',
        'target': 3,
        'gradient': 'linear-gradient(135deg, #FB923C 0%, #EA580C 50%, #7C2D12 100%)',
        'border_glow': 'rgba(234, 88, 12, 0.55)',
        'text_color': '#FFF7ED',
    },
    {
        'id': 'heritage_custodian',
        'name': 'สายบุญ & วัฒนธรรม',
        'subtitle': 'Heritage Custodian',
        'tier': 'emerald',
        'icon': 'landmark',
        'svg_icon': '/static/icons/badges/badge-heritage_custodian.svg',
        'description': 'เช็กอินวัดและโบราณสถานครบ 3 แห่ง',
        'category': 'temple',
        'target': 3,
        'gradient': 'linear-gradient(135deg, #34D399 0%, #059669 50%, #064E3B 100%)',
        'border_glow': 'rgba(16, 185, 129, 0.55)',
        'text_color': '#ECFDF5',
    },
    {
        'id': 'nature_wanderer',
        'name': 'ผู้หลงใหลธรรมชาติ',
        'subtitle': 'Nature Wanderer',
        'tier': 'forest',
        'icon': 'trees',
        'svg_icon': '/static/icons/badges/badge-nature_wanderer.svg',
        'description': 'เช็กอินอุทยาน ภูเขา หรือธรรมชาติครบ 3 แห่ง',
        'category': 'nature',
        'target': 3,
        'gradient': 'linear-gradient(135deg, #10B981 0%, #047857 50%, #064E3B 100%)',
        'border_glow': 'rgba(16, 185, 129, 0.55)',
        'text_color': '#ECFDF5',
    },
    {
        'id': 'social_star',
        'name': 'ดาวเด่นคอมมูนิตี้',
        'subtitle': 'Community Star',
        'tier': 'ruby',
        'icon': 'sparkles',
        'svg_icon': '/static/icons/badges/badge-social_star.svg',
        'description': 'ได้รับยอดถูกใจ (Likes) จากเพื่อนๆ รวม 15 ไลก์ขึ้นไป',
        'category': 'social',
        'target': 15,
        'gradient': 'linear-gradient(135deg, #F43F5E 0%, #E11D48 50%, #881337 100%)',
        'border_glow': 'rgba(244, 63, 94, 0.65)',
        'text_color': '#FFF1F2',
    },
    {
        'id': 'photo_master',
        'name': 'นักเล่าเรื่องภาพถ่าย',
        'subtitle': 'Master Storyteller',
        'tier': 'amethyst',
        'icon': 'camera',
        'svg_icon': '/static/icons/badges/badge-photo_master.svg',
        'description': 'สร้างโพสต์ภาพถ่ายบอกเล่าเรื่องราวครบ 8 โพสต์',
        'category': 'posts',
        'target': 8,
        'gradient': 'linear-gradient(135deg, #A855F7 0%, #7C3AED 50%, #4C1D95 100%)',
        'border_glow': 'rgba(168, 85, 247, 0.65)',
        'text_color': '#FAF5FF',
    },
]


def calculate_user_gamification(user):
    """
    Computes complete gamification profile for a given User.
    """
    if not user or not user.is_authenticated:
        return {
            'xp': 0, 'level': 1, 'level_title': 'นักเดินทางฝึกหัด (Rookie)', 'level_icon': 'compass',
            'level_svg': '/static/icons/levels/level-1.svg',
            'level_gradient': 'linear-gradient(135deg, #159F8C, #0D7A6C)',
            'level_progress_pct': 0, 'xp_for_next_level': 200, 'current_level_min_xp': 0,
            'badges': [], 'unlocked_count': 0, 'total_badges': len(BADGE_DEFINITIONS),
            'top_badge': None, 'stats': {}
        }

    user_posts = Post.objects.filter(user=user)
    total_posts = user_posts.count()
    
    # Unique locations checked in
    unique_location_ids = user_posts.values_list('location_id', flat=True).distinct()
    unique_locations_count = len(unique_location_ids)
    
    # Total likes received across all user's posts
    post_ids = user_posts.values_list('id', flat=True)
    total_likes_received = Like.objects.filter(post_id__in=post_ids).count()
    total_comments_received = Comment.objects.filter(post_id__in=post_ids).count()
    total_followers = user.followers_set.count()

    # Category breakdowns based on location category
    cafe_count = 0
    temple_count = 0
    nature_count = 0

    for p in user_posts.select_related('location__category'):
        cat_name = (p.location.category.name if p.location and p.location.category else '').lower()
        loc_name = (p.location.name if p.location else '').lower()
        
        if any(w in cat_name or w in loc_name for w in ['คาเฟ่', 'กาแฟ', 'cafe', 'coffee', 'อาหาร', 'กิน', 'restaurant']):
            cafe_count += 1
        elif any(w in cat_name or w in loc_name for w in ['วัด', 'ปราสาท', 'วัฒนธรรม', 'โบราณสถาน', 'temple', 'shrine']):
            temple_count += 1
        elif any(w in cat_name or w in loc_name for w in ['ธรรมชาติ', 'อุทยาน', 'ผา', 'น้ำตก', 'ป่า', 'nature', 'park']):
            nature_count += 1

    # XP Calculation (including admin bonus XP):
    profile = getattr(user, 'profile', None)
    bonus_xp = profile.bonus_xp if profile else 0
    total_xp = (total_posts * 50) + (unique_locations_count * 100) + (total_likes_received * 15) + (total_comments_received * 5) + (total_followers * 25) + bonus_xp

    # Level Thresholds
    LEVELS = [
        {'level': 1, 'min_xp': 0, 'max_xp': 200, 'title': 'นักเดินทางฝึกหัด (Rookie)', 'icon': 'compass', 'level_svg': '/static/icons/levels/level-1.svg', 'gradient': 'linear-gradient(135deg, #159F8C, #0D7A6C)'},
        {'level': 2, 'min_xp': 200, 'max_xp': 600, 'title': 'นักสำรวจท้องถิ่น (Explorer)', 'icon': 'map-pin', 'level_svg': '/static/icons/levels/level-2.svg', 'gradient': 'linear-gradient(135deg, #3B82F6, #1D4ED8)'},
        {'level': 3, 'min_xp': 600, 'max_xp': 1400, 'title': 'นักผจญภัยตัวยง (Adventurer)', 'icon': 'award', 'level_svg': '/static/icons/levels/level-3.svg', 'gradient': 'linear-gradient(135deg, #8B5CF6, #6D28D9)'},
        {'level': 4, 'min_xp': 1400, 'max_xp': 3000, 'title': 'ผู้เชี่ยวชาญการเดินทาง (Master)', 'icon': 'sparkles', 'level_svg': '/static/icons/levels/level-4.svg', 'gradient': 'linear-gradient(135deg, #F59E0B, #B45309)'},
        {'level': 5, 'min_xp': 3000, 'max_xp': 999999, 'title': 'ตำนานแห่งศรีสะเกษ (Grand Legend)', 'icon': 'crown', 'level_svg': '/static/icons/levels/level-5.svg', 'gradient': 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 50%, #EC4899 100%)'},
    ]

    custom_level = profile.custom_level if profile else 0
    if custom_level and 1 <= custom_level <= 5:
        current_tier = next((lvl for lvl in LEVELS if lvl['level'] == custom_level), LEVELS[0])
    else:
        current_tier = LEVELS[0]
        for lvl in LEVELS:
            if total_xp >= lvl['min_xp']:
                current_tier = lvl

    current_level = current_tier['level']
    min_xp = current_tier['min_xp']
    max_xp = current_tier['max_xp']
    if current_level >= 5:
        level_progress_pct = 100
        xp_for_next = max_xp
    else:
        level_progress_pct = min(100, max(0, int(((total_xp - min_xp) / (max_xp - min_xp)) * 100)))
        xp_for_next = max_xp

    # Process Badges
    processed_badges = []
    unlocked_count = 0
    top_badge = None

    for b in BADGE_DEFINITIONS:
        current_val = 0
        if b['category'] == 'checkin':
            current_val = unique_locations_count if b['id'] != 'first_step' else total_posts
        elif b['category'] == 'cafe':
            current_val = cafe_count
        elif b['category'] == 'temple':
            current_val = temple_count
        elif b['category'] == 'nature':
            current_val = nature_count
        elif b['category'] == 'social':
            current_val = total_likes_received
        elif b['category'] == 'posts':
            current_val = total_posts

        is_unlocked = current_val >= b['target']
        progress_pct = min(100, int((current_val / b['target']) * 100)) if b['target'] > 0 else 100
        
        badge_item = {
            **b,
            'current': current_val,
            'is_unlocked': is_unlocked,
            'progress_pct': progress_pct,
        }
        
        if is_unlocked:
            unlocked_count += 1
            # Priority top badge
            if not top_badge or b['target'] > top_badge['target']:
                top_badge = badge_item

        processed_badges.append(badge_item)

    # Sort: Unlocked first, then by progress percentage descending
    processed_badges.sort(key=lambda x: (not x['is_unlocked'], -x['progress_pct']))

    return {
        'xp': total_xp,
        'level': current_level,
        'level_title': current_tier['title'],
        'level_icon': current_tier['icon'],
        'level_svg': f'/static/icons/levels/level-{current_level}.svg',
        'level_gradient': current_tier['gradient'],
        'level_progress_pct': level_progress_pct,
        'xp_for_next_level': xp_for_next,
        'current_level_min_xp': min_xp,
        'badges': processed_badges,
        'unlocked_count': unlocked_count,
        'total_badges': len(BADGE_DEFINITIONS),
        'top_badge': top_badge,
        'stats': {
            'unique_locations': unique_locations_count,
            'total_posts': total_posts,
            'total_likes': total_likes_received,
            'cafe_count': cafe_count,
            'temple_count': temple_count,
            'nature_count': nature_count,
            'followers': total_followers
        }
    }
