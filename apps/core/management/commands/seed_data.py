from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.accounts.models import Profile
from apps.locations.models import Category, Location
from apps.posts.models import Post, PostImage
from apps.interactions.models import Like, Comment, SavedPost
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Populates the database with realistic demo data matching the reference image'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Seeding demo data for ที่นี่มีอะไร?...'))

        # 1. Categories
        categories_data = [
            {'name': 'คาเฟ่', 'slug': 'cafe', 'icon': 'coffee', 'order': 1},
            {'name': 'ธรรมชาติ', 'slug': 'nature', 'icon': 'trees', 'order': 2},
            {'name': 'วัด/วัฒนธรรม', 'slug': 'temple', 'icon': 'landmark', 'order': 3},
            {'name': 'จุดชมวิว', 'slug': 'viewpoint', 'icon': 'mountain', 'order': 4},
            {'name': 'ร้านอาหาร', 'slug': 'food', 'icon': 'utensils', 'order': 5},
            {'name': 'สตรีทอาร์ต', 'slug': 'street-art', 'icon': 'palette', 'order': 6},
        ]
        
        cat_map = {}
        for cat_info in categories_data:
            cat, _ = Category.objects.get_or_create(
                slug=cat_info['slug'],
                defaults={'name': cat_info['name'], 'icon': cat_info['icon'], 'order': cat_info['order']}
            )
            cat_map[cat_info['slug']] = cat

        # 2. Demo Users
        users_data = [
            {
                'username': 'arin_user',
                'first_name': 'อารินทร์',
                'email': 'arin@example.com',
                'display_name': 'อารินทร์',
                'avatar_url': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
                'bio': 'ชอบเดินทาง ค้นหาคาเฟ่ลับและมุมสวยๆ ในเมืองไทย 📷✨'
            },
            {
                'username': 'beam_user',
                'first_name': 'Beam',
                'email': 'beam@example.com',
                'display_name': 'Beam',
                'avatar_url': 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&h=200&q=80',
                'bio': 'Coffee lover & outdoor explorer based in Chiang Mai 🌿☕'
            },
            {
                'username': 'ploy_wander',
                'first_name': 'พลอย',
                'email': 'ploy@example.com',
                'display_name': 'Ploy Wander',
                'avatar_url': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&h=200&q=80',
                'bio': 'บันทึกความทรงจำผ่านภาพถ่ายและการเดินทาง'
            },
            {
                'username': 'thanwa_lens',
                'first_name': 'ธันวา',
                'email': 'thanwa@example.com',
                'display_name': 'Thanwa Lens',
                'avatar_url': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
                'bio': 'Landscape & Street Photographer 🏔️'
            }
        ]

        user_map = {}
        for u_data in users_data:
            user, created = User.objects.get_or_create(
                username=u_data['username'],
                defaults={'first_name': u_data['first_name'], 'email': u_data['email']}
            )
            if created:
                user.set_password('password123')
                user.save()
            profile = user.profile
            profile.display_name = u_data['display_name']
            profile.avatar_url = u_data['avatar_url']
            profile.bio = u_data['bio']
            profile.city = 'เชียงใหม่'
            profile.save()
            user_map[u_data['username']] = user

        # 3. Locations matching reference image cards and map markers
        # Real high quality curated travel photos matching reference:
        # Cafe in garden, Mae Sa waterfall, Doi Suthep, Mountain lake, Temple, Nimman, etc.
        locations_data = [
            {
                'name': 'คาเฟ่ในสวน',
                'slug': 'cafe-in-the-garden',
                'city': 'เชียงใหม่',
                'province': 'เชียงใหม่',
                'address': 'ต.สุเทพ อ.เมือง จ.เชียงใหม่',
                'latitude': 18.7915,
                'longitude': 98.9660,
                'distance_km': 1.2,
                'category': cat_map['cafe'],
                'cover_image_url': 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
                'is_featured': True,
                'order': 1,
                'cached_post_count': 128,
                'cached_photo_count': 256,
                'description': 'คาเฟ่บรรยากาศร่มรื่นกลางแมกไม้ กาแฟ Specialty และมุมถ่ายรูปธรรมชาติสุดชิลล์'
            },
            {
                'name': 'น้ำตกแม่สา',
                'slug': 'mae-sa-waterfall',
                'city': 'เชียงใหม่',
                'province': 'เชียงใหม่',
                'address': 'ต.แม่แรม อ.แม่ริม จ.เชียงใหม่',
                'latitude': 18.8654,
                'longitude': 98.9182,
                'distance_km': 15.3,
                'category': cat_map['nature'],
                'cover_image_url': 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
                'is_featured': True,
                'order': 2,
                'cached_post_count': 96,
                'cached_photo_count': 192,
                'description': 'น้ำตกสวยงาม 8 ชั้น ท่ามกลางธรรมชาติอุดมสมบูรณ์ เหมาะกับการพักผ่อนและเล่นน้ำ'
            },
            {
                'name': 'วัดพระธาตุดอยสุเทพ',
                'slug': 'wat-phra-that-doi-suthep',
                'city': 'เชียงใหม่',
                'province': 'เชียงใหม่',
                'address': 'ต.สุเทพ อ.เมือง จ.เชียงใหม่',
                'latitude': 18.8048,
                'longitude': 98.9216,
                'distance_km': 7.8,
                'category': cat_map['temple'],
                'cover_image_url': 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80',
                'is_featured': True,
                'order': 3,
                'cached_post_count': 167,
                'cached_photo_count': 312,
                'description': 'ปูชนียสถานคู่บ้านคู่เมืองเชียงใหม่ พร้อมจุดชมวิวเมืองแบบพาโนรามา'
            },
            {
                'name': 'อ่างแก้ว มหาวิทยาลัยเชียงใหม่',
                'slug': 'ang-kaew-cmu',
                'city': 'เชียงใหม่',
                'province': 'เชียงใหม่',
                'address': 'มหาวิทยาลัยเชียงใหม่ ต.สุเทพ',
                'latitude': 18.8035,
                'longitude': 98.9525,
                'distance_km': 2.4,
                'category': cat_map['viewpoint'],
                'cover_image_url': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
                'is_featured': False,
                'order': 4,
                'cached_post_count': 210,
                'cached_photo_count': 420,
                'description': 'อ่างเก็บน้ำวิวภูเขาดอยสุเทพ สถานที่ยอดฮิตสำหรับชมพระอาทิตย์ตกและเดินเล่น'
            },
            {
                'name': 'วัดอุโมงค์ สวนพุทธธรรม',
                'slug': 'wat-umong',
                'city': 'เชียงใหม่',
                'province': 'เชียงใหม่',
                'address': 'ต.สุเทพ อ.เมือง จ.เชียงใหม่',
                'latitude': 18.7830,
                'longitude': 98.9515,
                'distance_km': 3.0,
                'category': cat_map['temple'],
                'cover_image_url': 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
                'is_featured': False,
                'order': 5,
                'cached_post_count': 142,
                'cached_photo_count': 284,
                'description': 'วัดโบราณที่มีอุโมงค์เก่าแก่และบรรยากาศป่าสงบกลางเมือง'
            },
            {
                'name': 'นิมมานเหมินท์ ซอย 1',
                'slug': 'nimman-soi-1',
                'city': 'เชียงใหม่',
                'province': 'เชียงใหม่',
                'address': 'ถ.นิมมานเหมินท์ ต.สุเทพ',
                'latitude': 18.7995,
                'longitude': 98.9685,
                'distance_km': 1.8,
                'category': cat_map['street-art'],
                'cover_image_url': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
                'is_featured': False,
                'order': 6,
                'cached_post_count': 188,
                'cached_photo_count': 376,
                'description': 'ย่านอาร์ต คราฟต์ และแกลเลอรี่ แหล่งรวมดีไซน์และไลฟ์สไตล์ร่วมสมัย'
            },
            {
                'name': 'จุดชมวิวดอยปุย',
                'slug': 'doi-pui-viewpoint',
                'city': 'เชียงใหม่',
                'province': 'เชียงใหม่',
                'address': 'อุทยานแห่งชาติดอยสุเทพ-ปุย',
                'latitude': 18.8250,
                'longitude': 98.8950,
                'distance_km': 18.2,
                'category': cat_map['viewpoint'],
                'cover_image_url': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
                'is_featured': False,
                'order': 7,
                'cached_post_count': 75,
                'cached_photo_count': 150,
                'description': 'สัมผัสทะเลหมอกและอากาศหนาวเย็นบนยอดเขาสูง'
            }
        ]

        loc_map = {}
        for loc_info in locations_data:
            loc, created = Location.objects.get_or_create(
                slug=loc_info['slug'],
                defaults={
                    'name': loc_info['name'],
                    'city': loc_info['city'],
                    'province': loc_info['province'],
                    'address': loc_info['address'],
                    'latitude': loc_info['latitude'],
                    'longitude': loc_info['longitude'],
                    'distance_km': loc_info['distance_km'],
                    'category': loc_info['category'],
                    'cover_image_url': loc_info['cover_image_url'],
                    'is_featured': loc_info['is_featured'],
                    'order': loc_info['order'],
                    'cached_post_count': loc_info['cached_post_count'],
                    'cached_photo_count': loc_info['cached_photo_count'],
                    'description': loc_info['description'],
                    'created_by': user_map['arin_user']
                }
            )
            loc_map[loc_info['slug']] = loc

        # 4. Posts matching reference feed cards & map card
        now = timezone.now()
        posts_data = [
            {
                'user': user_map['beam_user'],
                'location': loc_map['cafe-in-the-garden'],
                'category': cat_map['cafe'],
                'caption': 'บรรยากาศดีมาก กาแฟอร่อย 🌿',
                'cover_image_url': 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
                'likes': 24,
                'comments': 6,
                'hours_ago': 2
            },
            {
                'user': user_map['ploy_wander'],
                'location': loc_map['mae-sa-waterfall'],
                'category': cat_map['nature'],
                'caption': 'น้ำใสไหลเย็น ชุ่มฉ่ำใจมากในวันหยุด 💧🍃',
                'cover_image_url': 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
                'likes': 48,
                'comments': 12,
                'hours_ago': 4
            },
            {
                'user': user_map['arin_user'],
                'location': loc_map['wat-phra-that-doi-suthep'],
                'category': cat_map['temple'],
                'caption': 'วิวเมืองเชียงใหม่ยามเย็น สวยงามตระการตามาก ✨',
                'cover_image_url': 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80',
                'likes': 85,
                'comments': 19,
                'hours_ago': 6
            },
            {
                'user': user_map['thanwa_lens'],
                'location': loc_map['ang-kaew-cmu'],
                'category': cat_map['viewpoint'],
                'caption': 'ลมเย็นๆ ยามเย็นกับน้องหมาวิ่งเล่น 🐶🌅',
                'cover_image_url': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
                'likes': 112,
                'comments': 25,
                'hours_ago': 24
            },
            {
                'user': user_map['beam_user'],
                'location': loc_map['wat-umong'],
                'category': cat_map['temple'],
                'caption': 'ความเงียบสงบใต้ร่มไม้และประวัติศาสตร์อันยาวนาน 🍃',
                'cover_image_url': 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
                'likes': 36,
                'comments': 8,
                'hours_ago': 30
            }
        ]

        for p_data in posts_data:
            post, created = Post.objects.get_or_create(
                user=p_data['user'],
                location=p_data['location'],
                defaults={
                    'category': p_data['category'],
                    'caption': p_data['caption'],
                    'cover_image_url': p_data['cover_image_url'],
                    'cached_likes_count': p_data['likes'],
                    'cached_comments_count': p_data['comments'],
                    'created_at': now - timedelta(hours=p_data['hours_ago'])
                }
            )
            # Add some demo comments
            if created:
                Comment.objects.create(
                    user=user_map['arin_user'],
                    post=post,
                    content='ถ่ายรูปสวยมากครับ เดี๋ยวตามรอยไปแน่นอน 👍'
                )
                Comment.objects.create(
                    user=user_map['ploy_wander'],
                    post=post,
                    content='กาแฟร้านนี้เด็ดจริงค่ะ ชอบมุมในสวนมาก'
                )
                Like.objects.create(
                    user=user_map['arin_user'],
                    post=post
                )
                SavedPost.objects.create(
                    user=user_map['arin_user'],
                    post=post
                )

        self.stdout.write(self.style.SUCCESS('Successfully seeded demo data for ที่นี่มีอะไร?!'))
