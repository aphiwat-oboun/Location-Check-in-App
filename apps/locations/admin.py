from django.contrib import admin
from .models import Category, Location

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'icon', 'order')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'category', 'latitude', 'longitude', 'is_featured')
    list_filter = ('city', 'category', 'is_featured')
    search_fields = ('name', 'city', 'description')
