from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse

class AdminAccessControlTests(TestCase):
    def setUp(self):
        self.client = Client()
        
        # Normal User (non-staff)
        self.normal_user = User.objects.create_user(
            username='normal_user',
            password='password123',
            is_staff=False
        )

        # Admin User (staff)
        self.admin_user = User.objects.create_user(
            username='admin_user',
            password='password123',
            is_staff=True,
            is_superuser=True
        )

    def test_anonymous_user_access_denied(self):
        """Anonymous user trying to access /admin-panel/ should be redirected to login"""
        response = self.client.get(reverse('admin_panel:dashboard'))
        self.assertEqual(response.status_code, 302)
        self.assertIn('/accounts/login/', response.url)

    def test_normal_authenticated_user_access_denied(self):
        """Normal authenticated non-staff user MUST be returned 403 Forbidden"""
        self.client.login(username='normal_user', password='password123')
        response = self.client.get(reverse('admin_panel:dashboard'))
        self.assertEqual(response.status_code, 403)
        self.assertContains(response, 'ปฏิเสธการเข้าถึง', status_code=403)

    def test_normal_authenticated_user_api_denied(self):
        """Normal authenticated user trying to hit admin API endpoints gets 403 JSON"""
        self.client.login(username='normal_user', password='password123')
        response = self.client.get(reverse('admin_panel:api_analytics'))
        self.assertEqual(response.status_code, 403)
        self.assertIn('Forbidden', response.json()['error'])

    def test_admin_staff_user_access_granted(self):
        """Authenticated staff user gets full access to Admin Panel dashboard"""
        self.client.login(username='admin_user', password='password123')
        response = self.client.get(reverse('admin_panel:dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'แดชบอร์ด')
        self.assertContains(response, 'ผู้ใช้งานทั้งหมด')
