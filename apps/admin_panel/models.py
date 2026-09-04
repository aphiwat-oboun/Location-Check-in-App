from django.db import models
from django.contrib.auth.models import User
from apps.posts.models import Post
from apps.locations.models import Location
from apps.interactions.models import Comment

class Report(models.Model):
    REPORT_TYPES = (
        ('post', 'โพสต์'),
        ('location', 'สถานที่'),
        ('comment', 'คอมเมนต์'),
        ('user', 'ผู้ใช้งาน'),
    )

    STATUS_CHOICES = (
        ('pending', 'รอตรวจสอบ'),
        ('reviewing', 'กำลังตรวจสอบ'),
        ('resolved', 'ดำเนินการแล้ว'),
        ('dismissed', 'ยกเลิก'),
    )

    REASON_CHOICES = (
        ('inappropriate', 'ไม่เหมาะสม'),
        ('incorrect_info', 'ข้อมูลผิดพลาด'),
        ('spam', 'สแปม / โฆษณา'),
        ('other', 'อื่นๆ'),
    )

    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='filed_reports')
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES, default='post')
    reason = models.CharField(max_length=30, choices=REASON_CHOICES, default='inappropriate')
    description = models.TextField(blank=True)
    
    post = models.ForeignKey(Post, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports')
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports')
    comment = models.ForeignKey(Comment, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports')
    target_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_reports')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    action_taken = models.CharField(max_length=100, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_reports')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def get_status_badge_class(self):
        mapping = {
            'pending': 'bg-red-50 text-red-600 border-red-200',
            'reviewing': 'bg-amber-50 text-amber-600 border-amber-200',
            'resolved': 'bg-emerald-50 text-emerald-600 border-emerald-200',
            'dismissed': 'bg-gray-50 text-gray-600 border-gray-200',
        }
        return mapping.get(self.status, 'bg-gray-50 text-gray-600')

    def get_status_display_thai(self):
        dict_status = dict(self.STATUS_CHOICES)
        return dict_status.get(self.status, self.status)

    def get_reason_display_thai(self):
        dict_reason = dict(self.REASON_CHOICES)
        return dict_reason.get(self.reason, self.reason)

    def __str__(self):
        return f"Report #{self.id} ({self.get_report_type_display()}) by {self.reporter.username}"


class AuditLog(models.Model):
    admin_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='admin_audit_logs')
    action = models.CharField(max_length=100) # e.g. "Deleted Post #12", "Suspended User @beam"
    target_repr = models.CharField(max_length=255, blank=True)
    details = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M')}] {self.admin_user} - {self.action}"


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.title}"
