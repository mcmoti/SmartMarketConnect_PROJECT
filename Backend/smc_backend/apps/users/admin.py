"""
Admin configuration for users app.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, StaffLog, ContactInquiry


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User model."""
    
    list_display = ['username', 'email', 'phone_number', 'role', 'is_verified', 'is_active']
    list_filter = ['role', 'is_verified', 'is_active', 'created_at']
    search_fields = ['username', 'email', 'phone_number', 'first_name', 'last_name']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email', 'phone_number')}),
        ('Profile', {'fields': ('profile_image', 'bio', 'location', 'latitude', 'longitude', 'profile_data', 'role')}),
        ('Status', {'fields': ('is_verified', 'is_active')}),
        ('Permissions', {'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined', 'created_at', 'updated_at')}),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'date_joined', 'last_login']


@admin.register(StaffLog)
class StaffLogAdmin(admin.ModelAdmin):
    list_display = ['staff_name', 'farmer', 'role', 'hours', 'date']
    list_filter = ['date']
    search_fields = ['staff_name', 'farmer__username', 'farmer__email']


@admin.register(ContactInquiry)
class ContactInquiryAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'subject', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['name', 'email', 'subject', 'message']
