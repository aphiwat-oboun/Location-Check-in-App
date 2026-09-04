from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.accounts.models import Profile
from apps.locations.models import Category, Location
from apps.posts.models import Post, PostImage
from apps.interactions.models import Like, Comment, SavedPost
from apps.admin_panel.models import Report, AuditLog
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Seeds full demo dataset for Admin Panel matching the visual reference image'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Seeding Admin Panel demo data...'))

        # 1. Admin Superuser: อารินทร์
        admin_user, created = User.objects.get_or_create(
            username='arin_admin',
            defaults={
                'email': 'arin.admin@example.com',
                'first_name': 'อารินทร์',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            admin_user.profile.display_name = 'อารินทร์'
            admin_user.profile.avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80'
            admin_user.profile.save()
        self.stdout.write(self.style.SUCCESS('Admin user created: arin_admin / admin123'))

        # 2. Demo Categories matching donut chart legend
        categories_data = [
            {'name': 'คาเฟ่', 'slug': 'cafe', 'icon': 'coffee', 'order': 1},
            {'name': 'ธรรมชาติ', 'slug': 'nature', 'icon': 'trees', 'order': 2},
            {'name': 'ท่องเที่ยว', 'slug': 'travel', 'icon': 'compass', 'order': 3},
            {'name': 'อาหาร', 'slug': 'food', 'icon': 'utensils', 'order': 4},
            {'name': 'ช้อปปิ้ง', 'slug': 'shopping', 'icon': 'shopping-bag', 'order': 5},
            {'name': 'อื่นๆ', 'slug': 'other', 'icon': 'more-horizontal', 'order': 6},
        ]
        cat_map = {}
        for c in categories_data:
            cat, _ = Category.objects.get_or_create(
                slug=c['slug'],
                defaults={'name': c['name'], 'icon': c['icon'], 'order': c['order']}
            )
            cat_map[c['slug']] = cat

        # 3. Demo Users matching Recent Users card & Recent Posts table
        demo_users = [
            {'username': 'beam_photo', 'display_name': 'Beam', 'email': 'beam@example.com', 'avatar': 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200'},
            {'username': 'milddd', 'display_name': 'Mild', 'email': 'mild@example.com', 'avatar': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200'},
            {'username': 'sky_blue', 'display_name': 'Sky', 'email': 'sky@example.com', 'avatar': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'},
            {'username': 'aommm', 'display_name': 'Aom', 'email': 'aom@example.com', 'avatar': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'},
            {'username': 'best_eat', 'display_name': 'Best', 'email': 'best@example.com', 'avatar': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200'},
            {'username': 'nongmint', 'display_name': 'Nongmint', 'email': 'mint@example.com', 'avatar': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'},
            {'username': 'ploy_w', 'display_name': 'Ploy W.', 'email': 'ploy@example.com', 'avatar': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200'},
            {'username': 'golfy_psd', 'display_name': 'Golfy', 'email': 'golfy@example.com', 'avatar': 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200'},
            {'username': 'natth_c', 'display_name': 'Natth', 'email': 'natth@example.com', 'avatar': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200'},
            {'username': 'jira_jj', 'display_name': 'Jira', 'email': 'jira@example.com', 'avatar': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200'},
        ]

        user_obj_map = {}
        for u in demo_users:
            usr, created = User.objects.get_or_create(
                username=u['username'],
                defaults={'email': u['email'], 'first_name': u['display_name']}
            )
            if created:
                usr.set_password('password123')
                usr.save()
            usr.profile.display_name = u['display_name']
            usr.profile.avatar_url = u['avatar']
            usr.profile.save()
            user_obj_map[u['username']] = usr

        # 4. Demo Locations
        loc_data = [
            {'slug': 'cafe-in-garden', 'name': 'คาเฟ่ในสวน', 'city': 'เชียงใหม่', 'lat': 18.7915, 'lng': 98.9660, 'cover': 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800', 'cat': cat_map['cafe']},
            {'slug': 'mae-kampong-waterfall', 'name': 'น้ำตกแม่กำปอง', 'city': 'เชียงใหม่', 'lat': 18.8654, 'lng': 99.3512, 'cover': 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800', 'cat': cat_map['nature']},
            {'slug': 'rim-khong', 'name': 'ริมโขง', 'city': 'หนองคาย', 'lat': 17.8783, 'lng': 102.7420, 'cover': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800', 'cat': cat_map['travel']},
            {'slug': 'wat-doi-suthep', 'name': 'วัดพระธาตุดอยสุเทพ', 'city': 'เชียงใหม่', 'lat': 18.8048, 'lng': 98.9216, 'cover': 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800', 'cat': cat_map['travel']},
            {'slug': 'baan-suan-restaurant', 'name': 'ร้านอาหารบ้านสวน', 'city': 'อุบลราชธานี', 'lat': 15.2286, 'lng': 104.8564, 'cover': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', 'cat': cat_map['food']},
        ]

        loc_obj_map = {}
        for l in loc_data:
            loc, _ = Location.objects.get_or_create(
                slug=l['slug'],
                defaults={
                    'name': l['name'],
                    'city': l['city'],
                    'latitude': l['lat'],
                    'longitude': l['lng'],
                    'cover_image_url': l['cover'],
                    'category': l['cat']
                }
            )
            loc_obj_map[l['slug']] = loc

        # 5. Posts matching Recent Posts table
        now = timezone.now()
        posts = [
            {'user': user_obj_map['beam_photo'], 'loc': loc_obj_map['cafe-in-garden'], 'cat': cat_map['cafe'], 'caption': 'คาเฟ่วิวทุ่งนา บรรยากาศดีมาก 🌱', 'hours_ago': 0.03, 'cover': loc_obj_map['cafe-in-garden'].cover_image_url},
            {'user': user_obj_map['milddd'], 'loc': loc_obj_map['mae-kampong-waterfall'], 'cat': cat_map['nature'], 'caption': 'น้ำตกแม่กำปอง สวยมากกก', 'hours_ago': 0.25, 'cover': loc_obj_map['mae-kampong-waterfall'].cover_image_url},
            {'user': user_obj_map['sky_blue'], 'loc': loc_obj_map['rim-khong'], 'cat': cat_map['travel'], 'caption': 'บรรยากาศยามเย็นที่ริมโขง', 'hours_ago': 1.0, 'cover': loc_obj_map['rim-khong'].cover_image_url},
            {'user': user_obj_map['aommm'], 'loc': loc_obj_map['wat-doi-suthep'], 'cat': cat_map['travel'], 'caption': 'วัดพระธาตุดอยสุเทพ 🙏', 'hours_ago': 2.0, 'cover': loc_obj_map['wat-doi-suthep'].cover_image_url},
            {'user': user_obj_map['best_eat'], 'loc': loc_obj_map['baan-suan-restaurant'], 'cat': cat_map['food'], 'caption': 'ร้านอาหารอร่อยในอุบลฯ', 'hours_ago': 3.0, 'cover': loc_obj_map['baan-suan-restaurant'].cover_image_url},
        ]

        created_posts = []
        for p in posts:
            pst, _ = Post.objects.get_or_create(
                user=p['user'],
                location=p['loc'],
                caption=p['caption'],
                defaults={
                    'category': p['cat'],
                    'cover_image_url': p['cover'],
                    'created_at': now - timedelta(hours=p['hours_ago'])
                }
            )
            created_posts.append(pst)

        # 6. Reports matching Recent Reports card
        reports_data = [
            {'reporter': user_obj_map['beam_photo'], 'type': 'post', 'reason': 'inappropriate', 'post': created_posts[0]},
            {'reporter': user_obj_map['milddd'], 'type': 'location', 'reason': 'incorrect_info', 'location': loc_obj_map['baan-suan-restaurant']},
            {'reporter': user_obj_map['sky_blue'], 'type': 'post', 'reason': 'inappropriate', 'post': created_posts[2]},
            {'reporter': user_obj_map['aommm'], 'type': 'comment', 'reason': 'spam'},
        ]

        for r in reports_data:
            Report.objects.get_or_create(
                reporter=r['reporter'],
                reason=r['reason'],
                defaults={
                    'report_type': r['type'],
                    'post': r.get('post'),
                    'location': r.get('location'),
                    'status': 'pending'
                }
            )

        # 7. Audit Log Initial Records
        AuditLog.objects.get_or_create(
            admin_user=admin_user,
            action='เริ่มต้นระบบ Admin Panel',
            defaults={'details': 'ติดตั้งระบบ Admin Panel เรียบร้อยแล้ว', 'ip_address': '127.0.0.1'}
        )

        self.stdout.write(self.style.SUCCESS('Successfully seeded full demo dataset matching the visual source of truth!'))
