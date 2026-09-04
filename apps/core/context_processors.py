from apps.locations.models import Category

def global_context(request):
    categories = Category.objects.all()[:8]
    return {
        'global_categories': categories,
        'app_name_th': 'ที่นี่มีอะไร?',
        'app_name_en': "What's Here?",
    }
