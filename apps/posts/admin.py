from django.contrib import admin
from .models import Post, PostImage

class PostImageInline(admin.TabularInline):
    model = PostImage
    extra = 1

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'location', 'created_at', 'is_published')
    list_filter = ('is_published', 'created_at', 'category')
    search_fields = ('caption', 'location__name', 'user__username')
    inlines = [PostImageInline]
