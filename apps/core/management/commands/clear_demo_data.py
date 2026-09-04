from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.posts.models import Post, PostImage
from apps.locations.models import Location, Category
from apps.interactions.models import Like, Comment, SavedPost
from apps.admin_panel.models import Report, AuditLog

class Command(BaseCommand):
    help = 'Clears out all demo data (Posts, Locations, Comments, Reports, Demo Users) to prepare for real production usage.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Clearing all demo data...'))

        # Delete interactions & posts & reports
        Report.objects.all().delete()
        Comment.objects.all().delete()
        Like.objects.all().delete()
        SavedPost.objects.all().delete()
        PostImage.objects.all().delete()
        Post.objects.all().delete()
        Location.objects.all().delete()

        # Delete demo users except superusers / admin if user wants
        demo_usernames = [
            'arin_user', 'beam_user', 'ploy_wander', 'thanwa_lens',
            'beam_photo', 'milddd', 'sky_blue', 'aommm', 'best_eat',
            'nongmint', 'ploy_w', 'golfy_psd', 'natth_c', 'jira_jj'
        ]
        User.objects.filter(username__in=demo_usernames).delete()

        self.stdout.write(self.style.SUCCESS('Successfully cleared demo data! Your application is now ready for real users and real data.'))
