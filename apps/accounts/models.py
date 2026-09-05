from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=100, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True)
    city = models.CharField(max_length=100, default='ศรีสะเกษ')
    cover_image = models.ImageField(upload_to='covers/', blank=True, null=True)
    cover_image_url = models.URLField(max_length=500, blank=True, null=True)
    is_suspended = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_display_name(self):
        return self.display_name or self.user.get_full_name() or self.user.username

    def get_avatar_url(self):
        if self.avatar and hasattr(self.avatar, 'url'):
            return self.avatar.url
        if self.avatar_url:
            return self.avatar_url
        return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' fill='%23E5E7EB' rx='64'/%3E%3Ccircle cx='64' cy='46' r='22' fill='%239CA3AF'/%3E%3Cpath d='M24 108c0-22.091 17.909-38 40-38s40 15.909 40 38' fill='%239CA3AF'/%3E%3C/svg%3E"

    def get_cover_url(self):
        if self.cover_image and hasattr(self.cover_image, 'url'):
            return self.cover_image.url
        if self.cover_image_url:
            return self.cover_image_url
        return None

    def __str__(self):
        return f"{self.get_display_name()} (@{self.user.username})"


class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following_set')
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers_set')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"

