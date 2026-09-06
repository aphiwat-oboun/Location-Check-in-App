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
    help = 'Clears all existing posts and locations, then seeds real tourist attractions exclusively in Mueang Si Sa Ket District, Si Sa Ket Province.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Clearing all existing posts, locations, and reports...'))

        # 1. Delete all previous posts, reports, comments, likes, saved posts, and locations
        Report.objects.all().delete()
        Comment.objects.all().delete()
        Like.objects.all().delete()
        SavedPost.objects.all().delete()
        PostImage.objects.all().delete()
        Post.objects.all().delete()
        Location.objects.all().delete()

        self.stdout.write(self.style.SUCCESS('Cleared previous records successfully.'))

        # 2. Ensure Admin & Creator User exists
        admin_user, _ = User.objects.get_or_create(
            username='arin_admin',
            defaults={
                'email': 'admin@example.com',
                'first_name': 'อารินทร์',
                'is_staff': True,
                'is_superuser': True
            }
        )
        admin_user.set_password('admin123')
        admin_user.save()
        profile_admin, _ = Profile.objects.get_or_create(user=admin_user)
        profile_admin.display_name = 'อารินทร์'
        profile_admin.city = 'ศรีสะเกษ'
        profile_admin.save()

        user_film, _ = User.objects.get_or_create(
            username='film_photo',
            defaults={'email': 'film@example.com', 'first_name': 'Film'}
        )
        user_film.set_password('password123')
        user_film.save()
        profile_film, _ = Profile.objects.get_or_create(user=user_film)
        profile_film.display_name = 'Film'
        profile_film.avatar_url = 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200'
        profile_film.city = 'ศรีสะเกษ'
        profile_film.save()

        # 3. Setup Categories
        categories_data = [
            {'name': 'ธรรมชาติ', 'slug': 'nature', 'icon': 'trees', 'order': 1},
            {'name': 'วัด/วัฒนธรรม', 'slug': 'temple', 'icon': 'landmark', 'order': 2},
            {'name': 'ท่องเที่ยว', 'slug': 'travel', 'icon': 'compass', 'order': 3},
            {'name': 'จุดชมวิว', 'slug': 'viewpoint', 'icon': 'mountain', 'order': 4},
            {'name': 'คาเฟ่', 'slug': 'cafe', 'icon': 'coffee', 'order': 5},
            {'name': 'ร้านอาหาร', 'slug': 'food', 'icon': 'utensils', 'order': 6},
        ]
        cat_map = {}
        for c in categories_data:
            cat, _ = Category.objects.get_or_create(
                slug=c['slug'],
                defaults={'name': c['name'], 'icon': c['icon'], 'order': c['order']}
            )
            cat_map[c['slug']] = cat

        # 4. Real Tourist Attractions in Mueang Si Sa Ket District (อำเภอเมืองศรีสะเกษ)
        sisaket_locations = [
            {
                'name': 'สวนสมเด็จพระศรีนครินทร์ ศรีสะเกษ',
                'slug': 'somdet-park-sisaket',
                'city': 'อ.เมืองศรีสะเกษ',
                'province': 'ศรีสะเกษ',
                'address': 'ต.หนองครก อ.เมืองศรีสะเกษ จ.ศรีสะเกษ',
                'latitude': 15.1015,
                'longitude': 104.3085,
                'category': cat_map['nature'],
                'cover_image_url': 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
                'description': 'สวนสาธารณะแห่งแรกในโครงการสวนสมเด็จฯ โดดเด่นด้วยดงต้นลำดวนธรรมชาติกว่า 50,000 ต้น ส่งกลิ่นหอมอบอวล มีสวนสัตว์ศรีสะเกษและอ่างเก็บน้ำห้วยน้ำคำ เหมาะแก่การพักผ่อนผ่อนคลาย',
                'is_featured': True,
                'order': 1,
            },
            {
                'name': 'วัดมหาพุทธาราม (วัดพระโต)',
                'slug': 'wat-maha-phuttharam-phra-to',
                'city': 'อ.เมืองศรีสะเกษ',
                'province': 'ศรีสะเกษ',
                'address': 'ถ.ขุขันธ์ ต.เมืองเหนือ อ.เมืองศรีสะเกษ จ.ศรีสะเกษ',
                'latitude': 15.1192,
                'longitude': 104.3258,
                'category': cat_map['temple'],
                'cover_image_url': 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80',
                'description': 'พระอารามหลวงชั้นตรีกลางเมืองศรีสะเกษ ประดิษฐาน "หลวงพ่อโต" พระพุทธรูปองค์ใหญ่ปางมารวิชัยศิลปะเชียงแสน ศักดิ์สิทธิ์และเป็นศูนย์รวมจิตใจของชาวศรีสะเกษ',
                'is_featured': True,
                'order': 2,
            },
            {
                'name': 'ศูนย์แสดงพันธุ์สัตว์น้ำศรีสะเกษ (Sisaket Aquarium)',
                'slug': 'sisaket-aquarium',
                'city': 'อ.เมืองศรีสะเกษ',
                'province': 'ศรีสะเกษ',
                'address': 'เกาะกลางน้ำ อ่างเก็บน้ำห้วยน้ำคำ ต.หนองครก อ.เมืองศรีสะเกษ จ.ศรีสะเกษ',
                'latitude': 15.0970,
                'longitude': 104.3120,
                'category': cat_map['travel'],
                'cover_image_url': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
                'description': 'ศูนย์แสดงพันธุ์สัตว์น้ำแห่งแรกในอีสานใต้ มีอุโมงค์แก้วใต้น้ำจัดแสดงปลาน้ำจืดสายพันธุ์ไทยและปลาทะเลหายาก ตั้งอยู่บนเกาะกลางน้ำห้วยน้ำคำ',
                'is_featured': True,
                'order': 3,
            },
            {
                'name': 'ศาลหลักเมืองศรีสะเกษ',
                'slug': 'sisaket-city-pillar-shrine',
                'city': 'อ.เมืองศรีสะเกษ',
                'province': 'ศรีสะเกษ',
                'address': 'สี่แยกเมืองเหนือ ต.เมืองเหนือ อ.เมืองศรีสะเกษ จ.ศรีสะเกษ',
                'latitude': 15.1162,
                'longitude': 104.3225,
                'category': cat_map['temple'],
                'cover_image_url': 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
                'description': 'ศาลหลักเมืองสวยงามตระการตา ยอดเสาหลักเมืองทำจากไม้ชัยพฤกษ์แกะสลักอย่างปราณีต ตั้งอยู่ใจกลางเมืองศรีสะเกษ',
                'is_featured': False,
                'order': 4,
            },
            {
                'name': 'หอศรีลำดวนเฉลิมพระเกียรติ (หอชมเมืองศรีสะเกษ)',
                'slug': 'srilamduan-tower',
                'city': 'อ.เมืองศรีสะเกษ',
                'province': 'ศรีสะเกษ',
                'address': 'เกาะกลางน้ำ ห้วยน้ำคำ ต.หนองครก อ.เมืองศรีสะเกษ จ.ศรีสะเกษ',
                'latitude': 15.0985,
                'longitude': 104.3135,
                'category': cat_map['viewpoint'],
                'cover_image_url': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
                'description': 'หอชมเมืองความสูง 84 เมตร บนเกาะกลางน้ำห้วยน้ำคำ เป็นจุดชมวิวเมืองศรีสะเกษแบบ 360 องศา พร้อมนิทรรศการประวัติศาสตร์เมือง',
                'is_featured': False,
                'order': 5,
            },
            {
                'name': 'คาเฟ่อินสวน ศรีสะเกษ (In Suan Cafe)',
                'slug': 'in-suan-cafe-sisaket',
                'city': 'อ.เมืองศรีสะเกษ',
                'province': 'ศรีสะเกษ',
                'address': 'ต.หนองครก อ.เมืองศรีสะเกษ จ.ศรีสะเกษ',
                'latitude': 15.1080,
                'longitude': 104.3180,
                'category': cat_map['cafe'],
                'cover_image_url': 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
                'description': 'คาเฟ่สไตล์สวนธรรมชาติ บรรยากาศร่มรื่นกลางเมืองศรีสะเกษ เสิร์ฟกาแฟ Specialty ดริป และขนมโฮมเมดอร่อยชิลล์ๆ',
                'is_featured': False,
                'order': 6,
            },
            {
                'name': 'ร้านอาหารบ้านสวนศรีสะเกษ',
                'slug': 'baan-suan-restaurant-sisaket',
                'city': 'อ.เมืองศรีสะเกษ',
                'province': 'ศรีสะเกษ',
                'address': 'ต.โพธิ์ อ.เมืองศรีสะเกษ จ.ศรีสะเกษ',
                'latitude': 15.1250,
                'longitude': 104.3350,
                'category': cat_map['food'],
                'cover_image_url': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
                'description': 'ร้านอาหารชื่อดังของเมืองศรีสะเกษ เสิร์ฟเมนูปลาสด เมนูอาหารอีสานแซ่บๆ และอาหารไทยรสกลมกล่อม บรรยากาศอบอุ่น',
                'is_featured': False,
                'order': 7,
            },
            {
                'name': 'วัดพระธาตุสุพรรณหงส์',
                'slug': 'wat-phra-that-suphannahong',
                'city': 'อ.เมืองศรีสะเกษ',
                'province': 'ศรีสะเกษ',
                'address': 'ต.น้ำคำ อ.เมืองศรีสะเกษ จ.ศรีสะเกษ',
                'latitude': 15.0645,
                'longitude': 104.2882,
                'category': cat_map['temple'],
                'cover_image_url': 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=800&q=80',
                'description': 'โดดเด่นด้วยพระอุโบสถจำลองบนเรือสุพรรณหงส์กลางน้ำ ประดิษฐานพระบรมสารีริกธาตุ ล้อมรอบด้วยธรรมชาติสวยงามและตลาดโบราณ',
                'is_featured': True,
                'order': 8,
            },
            {
                'name': 'วัดป่ามหาเจดีย์แก้ว (วัดล้านขวด)',
                'slug': 'wat-pa-maha-chedi-kaew',
                'city': 'อ.ขุขันธ์',
                'province': 'ศรีสะเกษ',
                'address': 'ต.ดอนเอ็ม อ.ขุขันธ์ จ.ศรีสะเกษ',
                'latitude': 14.6190,
                'longitude': 104.4225,
                'category': cat_map['temple'],
                'cover_image_url': 'https://images.unsplash.com/photo-1548013146-72479768bbaa?auto=format&fit=crop&w=800&q=80',
                'description': 'วัดสร้างด้วยขวดแก้วรีไซเคิลกว่า 1.5 ล้านขวด ทั้งศาลา พระเจดีย์ และซุ้มประตู เป็น Unseen Thailand ที่นักท่องเที่ยวต้องมาเยือน',
                'is_featured': True,
                'order': 9,
            },
            {
                'name': 'ผามออีแดง (อุทยานแห่งชาติเขาพระวิหาร)',
                'slug': 'pha-mo-e-daeng',
                'city': 'อ.กันทรลักษ์',
                'province': 'ศรีสะเกษ',
                'address': 'ต.เสาธงชัย อ.กันทรลักษ์ จ.ศรีสะเกษ',
                'latitude': 14.3758,
                'longitude': 104.7083,
                'category': cat_map['viewpoint'],
                'cover_image_url': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
                'description': 'จุดชมวิวทะเลหมอกยามเช้าและหน้าผาสูงขอบชายแดนไทย-กัมพูชา พร้อมสลักนูนต่ำประวัติศาสตร์อายุเก่าแก่กว่า 1,000 ปี',
                'is_featured': True,
                'order': 10,
            },
            {
                'name': 'ปราสาทวัดสระกำแพงใหญ่',
                'slug': 'wat-sa-kampaeng-yai',
                'city': 'อ.อุทุมพรพิสัย',
                'province': 'ศรีสะเกษ',
                'address': 'ต.สระกำแพงใหญ่ อ.อุทุมพรพิสัย จ.ศรีสะเกษ',
                'latitude': 15.1110,
                'longitude': 104.1278,
                'category': cat_map['temple'],
                'cover_image_url': 'https://images.unsplash.com/photo-1609830501868-809794cb1f40?auto=format&fit=crop&w=800&q=80',
                'description': 'ปราสาทขอมโบราณขนาดใหญ่และสมบูรณ์ที่สุดในจังหวัดศรีสะเกษ สร้างขึ้นในพุทธศตวรรษที่ 16 ศิลปะแบบบาปวน',
                'is_featured': False,
                'order': 11,
            },
            {
                'name': 'Nita Cafe & Roastery (นิตา คาเฟ่ ศรีสะเกษ)',
                'slug': 'nita-cafe-sisaket',
                'city': 'อ.เมืองศรีสะเกษ',
                'province': 'ศรีสะเกษ',
                'address': 'ถ.อุบล ต.โพธิ์ อ.เมืองศรีสะเกษ จ.ศรีสะเกษ',
                'latitude': 15.1135,
                'longitude': 104.3290,
                'category': cat_map['cafe'],
                'cover_image_url': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
                'description': 'คาเฟ่คั่วกาแฟเองสไตล์มินิมอล ตกแต่งคุมโทนสวยงาม มีเมนูกาแฟ Specialty Beans คัดสรรอย่างดีและเค้กโฮมเมดสดใหม่ทุกวัน',
                'is_featured': False,
                'order': 12,
            },
            {
                'name': 'ร้านอาหารครัวเบญจรงค์ ศรีสะเกษ',
                'slug': 'krua-benjarong-sisaket',
                'city': 'อ.เมืองศรีสะเกษ',
                'province': 'ศรีสะเกษ',
                'address': 'ถ.ทองมาก ต.โพธิ์ อ.เมืองศรีสะเกษ จ.ศรีสะเกษ',
                'latitude': 15.1180,
                'longitude': 104.3315,
                'category': cat_map['food'],
                'cover_image_url': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
                'description': 'ร้านอาหารไทยและอาหารพื้นบ้านรสชาติเข้มข้น จัดจ้าน บรรยากาศกว้างขวาง เหมาะสำหรับมื้อครอบครัวและเลี้ยงรับรอง',
                'is_featured': False,
                'order': 13,
            },
            {
                'name': 'สวนสาธารณะเกาะกลางน้ำห้วยน้ำคำ',
                'slug': 'huai-nam-kham-park',
                'city': 'อ.เมืองศรีสะเกษ',
                'province': 'ศรีสะเกษ',
                'address': 'ต.หนองครก อ.เมืองศรีสะเกษ จ.ศรีสะเกษ',
                'latitude': 15.0965,
                'longitude': 104.3115,
                'category': cat_map['nature'],
                'cover_image_url': 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=80',
                'description': 'สถานที่วิ่งออกกำลังกายและปั่นจักรยานยอดนิยม ล้อมรอบด้วยอ่างเก็บน้ำ บรรยากาศร่มรื่น วิวพระอาทิตย์ตกสวยงามมาก',
                'is_featured': False,
                'order': 14,
            }
        ]

        loc_obj_map = {}
        for l_data in sisaket_locations:
            loc, _ = Location.objects.get_or_create(
                slug=l_data['slug'],
                defaults={
                    'name': l_data['name'],
                    'city': l_data['city'],
                    'province': l_data['province'],
                    'address': l_data['address'],
                    'latitude': l_data['latitude'],
                    'longitude': l_data['longitude'],
                    'category': l_data['category'],
                    'cover_image_url': l_data['cover_image_url'],
                    'description': l_data['description'],
                    'is_featured': l_data['is_featured'],
                    'order': l_data['order'],
                    'created_by': admin_user
                }
            )
            loc.cover_image_url = l_data['cover_image_url']
            loc.save()
            loc_obj_map[l_data['slug']] = loc

        # 5. Real Posts in Mueang Si Sa Ket
        now = timezone.now()
        posts_data = [
            {
                'user': user_film,
                'loc': loc_obj_map['somdet-park-sisaket'],
                'cat': cat_map['nature'],
                'caption': 'ดอกลำดวนในสวนสมเด็จฯ ส่งกลิ่นหอมอบอวล ร่มรื่นมากครับ 🌸🌿',
                'cover': loc_obj_map['somdet-park-sisaket'].cover_image_url,
                'hours_ago': 2
            },
            {
                'user': admin_user,
                'loc': loc_obj_map['wat-maha-phuttharam-phra-to'],
                'cat': cat_map['temple'],
                'caption': 'กราบขอพรหลวงพ่อโต วัดมหาพุทธาราม พระคู่บ้านคู่เมืองศรีสะเกษ ✨🙏',
                'cover': loc_obj_map['wat-maha-phuttharam-phra-to'].cover_image_url,
                'hours_ago': 5
            },
            {
                'user': user_film,
                'loc': loc_obj_map['sisaket-aquarium'],
                'cat': cat_map['travel'],
                'caption': 'ตื่นตาตื่นใจกับอุโมงค์ปลาน้ำจืดที่เกาะกลางน้ำศรีสะเกษ สนุกมาก! 🐟🌊',
                'cover': loc_obj_map['sisaket-aquarium'].cover_image_url,
                'hours_ago': 8
            },
            {
                'user': admin_user,
                'loc': loc_obj_map['srilamduan-tower'],
                'cat': cat_map['viewpoint'],
                'caption': 'วิวเมืองศรีสะเกษแบบ 360 องศาบนหอชมเมืองศรีลำดวน สวยตระการตามาก 🌅',
                'cover': loc_obj_map['srilamduan-tower'].cover_image_url,
                'hours_ago': 12
            },
            {
                'user': user_film,
                'loc': loc_obj_map['in-suan-cafe-sisaket'],
                'cat': cat_map['cafe'],
                'caption': 'จิบกาแฟในสวนบรรยากาศชิลล์ๆ กลางเมืองศรีสะเกษ ☕🌿',
                'cover': loc_obj_map['in-suan-cafe-sisaket'].cover_image_url,
                'hours_ago': 24
            }
        ]

        for p_data in posts_data:
            post, created = Post.objects.get_or_create(
                user=p_data['user'],
                location=p_data['loc'],
                caption=p_data['caption'],
                defaults={
                    'category': p_data['cat'],
                    'cover_image_url': p_data['cover'],
                    'created_at': now - timedelta(hours=p_data['hours_ago'])
                }
            )
            if created:
                Like.objects.create(user=admin_user, post=post)
                Comment.objects.create(
                    user=admin_user,
                    post=post,
                    content='ยินดีต้อนรับสู่เมืองศรีสะเกษครับ! บรรยากาศสวยงามมาก 👍'
                )

        self.stdout.write(self.style.SUCCESS('Successfully cleared old data and seeded real Mueang Si Sa Ket attractions!'))
