from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from apps.locations.models import Location, Category

class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='posts')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='posts')
    
    title = models.CharField(max_length=200, blank=True)
    caption = models.TextField(blank=True, help_text='Short story / review / description')
    
    cover_image = models.ImageField(upload_to='posts/', blank=True, null=True)
    cover_image_url = models.URLField(max_length=500, blank=True, null=True)
    
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    cached_likes_count = models.PositiveIntegerField(default=0)
    cached_comments_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def get_cover_url(self):
        if self.cover_image and hasattr(self.cover_image, 'url'):
            return self.cover_image.url
        if self.cover_image_url:
            return self.cover_image_url
        first_img = self.images.first()
        if first_img:
            return first_img.get_image_url()
        return "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80"

    def get_likes_count(self):
        return self.cached_likes_count

    def get_comments_count(self):
        return self.cached_comments_count

    def get_time_ago_str(self):
        now = timezone.now()
        diff = now - self.created_at
        seconds = diff.total_seconds()
        
        if seconds < 60:
            return 'เมื่อสักครู่'
        elif seconds < 3600:
            minutes = int(seconds // 60)
            return f'{minutes} นาทีที่แล้ว'
        elif seconds < 86400:
            hours = int(seconds // 3600)
            return f'{hours} ชั่วโมงที่แล้ว'
        elif seconds < 604800:
            days = int(seconds // 86400)
            return f'{days} วันที่แล้ว'
        else:
            return self.created_at.strftime('%d %b %Y')

    def is_liked_by(self, user):
        if not user or not user.is_authenticated:
            return False
        return self.likes.filter(user=user).exists()

    def is_saved_by(self, user):
        if not user or not user.is_authenticated:
            return False
        return self.saved_by.filter(user=user).exists()

    def __str__(self):
        return f"Post by {self.user.username} at {self.location.name}"

class PostImage(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='posts/', blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    caption = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def get_image_url(self):
        if self.image and hasattr(self.image, 'url'):
            return self.image.url
        return self.image_url or ''

    def __str__(self):
        return f"Image for Post {self.post_id}"
