import math
from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    icon = models.CharField(max_length=50, default='map-pin', help_text='Lucide icon name')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['order', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True) or 'cat'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Location(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=250, blank=True)
    city = models.CharField(max_length=100, default='เชียงใหม่')
    province = models.CharField(max_length=100, default='เชียงใหม่')
    address = models.CharField(max_length=300, blank=True)
    latitude = models.FloatField(default=18.7953)
    longitude = models.FloatField(default=98.9620)
    distance_km = models.FloatField(default=1.2, help_text='Display distance in km')
    
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='locations')
    description = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to='locations/', blank=True, null=True)
    cover_image_url = models.URLField(max_length=500, blank=True, null=True)
    
    is_featured = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    
    cached_post_count = models.PositiveIntegerField(default=0)
    cached_photo_count = models.PositiveIntegerField(default=0)
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_locations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True) or f"loc-{self.latitude}-{self.longitude}"
        super().save(*args, **kwargs)

    def get_cover_url(self):
        if self.cover_image and hasattr(self.cover_image, 'url'):
            return self.cover_image.url
        if self.cover_image_url:
            return self.cover_image_url
        # Look for latest post image
        first_post = self.posts.filter(is_published=True).first()
        if first_post:
            return first_post.get_cover_url()
        return "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80"

    def get_post_count(self):
        count = self.posts.filter(is_published=True).count()
        return count or self.cached_post_count

    def get_photo_count(self):
        count = sum([p.images.count() + (1 if p.cover_image or p.cover_image_url else 0) for p in self.posts.filter(is_published=True)])
        return count or self.cached_photo_count

    def calculate_distance_from(self, lat, lng):
        """Calculate distance using haversine formula in km"""
        R = 6371.0
        dlat = math.radians(self.latitude - lat)
        dlng = math.radians(self.longitude - lng)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat)) * math.cos(math.radians(self.latitude)) *
             math.sin(dlng / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(R * c, 1)

    def __str__(self):
        return f"{self.name} ({self.city})"
