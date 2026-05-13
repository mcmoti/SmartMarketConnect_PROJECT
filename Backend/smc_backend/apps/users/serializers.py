"""
Serializers for user authentication and profile management.
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils.text import slugify
from .models import User, StaffLog, ContactInquiry, FarmerProfile, BuyerProfile

class FarmerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmerProfile
        exclude = ('user', 'id', 'created_at', 'updated_at')

class BuyerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerProfile
        exclude = ('user', 'id', 'created_at', 'updated_at')


def _split_full_name(full_name):
    full_name = (full_name or '').strip()
    if not full_name:
        return '', ''

    parts = full_name.split()
    if len(parts) == 1:
        return parts[0], ''
    return parts[0], ' '.join(parts[1:])


def _build_unique_username(seed):
    base = slugify(seed or 'user').replace('-', '_')[:150] or 'user'
    candidate = base
    index = 1

    while User.objects.filter(username=candidate).exists():
        suffix = f'_{index}'
        candidate = f'{base[:150-len(suffix)]}{suffix}'
        index += 1

    return candidate

class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone = serializers.CharField(source='phone_number', write_only=True, required=False, allow_blank=True)
    latitude = serializers.DecimalField(
        max_digits=20, decimal_places=10,
        required=False, allow_null=True
    )
    longitude = serializers.DecimalField(
        max_digits=20, decimal_places=10,
        required=False, allow_null=True
    )
    profile_data = serializers.JSONField(required=False, write_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'password_confirm',
            'phone_number', 'phone', 'role', 'first_name', 'last_name',
            'full_name', 'location', 'latitude', 'longitude', 'profile_data'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True},
            'username': {'required': False},
            'phone_number': {'required': False, 'write_only': True},
        }
    
    def validate(self, data):
        """Validate password matching."""
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError(
                {'password': 'Passwords do not match.'}
            )

        role = data.get('role', 'buyer')
        if not data.get('phone_number'):
            if role == 'creditor':
                # Auto-generate a unique placeholder for creditors who don't have a personal phone
                import uuid
                data['phone_number'] = f'+000{uuid.uuid4().hex[:10]}'
            else:
                raise serializers.ValidationError({'phone': 'Phone number is required.'})

        return data
    
    def validate_username(self, value):
        """Validate unique username."""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already exists.')
        return value
    
    def validate_email(self, value):
        """Validate unique email."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email already exists.')
        return value
    
    def validate_phone_number(self, value):
        """Validate unique phone number."""
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('Phone number already registered.')
        return value

    def validate_phone(self, value):
        return self.validate_phone_number(value)
    
    def create(self, validated_data):
        """Create a new user."""
        full_name = validated_data.pop('full_name', '')
        first_name, last_name = _split_full_name(full_name)
        email = validated_data['email']
        username = validated_data.get('username') or _build_unique_username(email.split('@')[0] or full_name)

        profile_data = validated_data.pop('profile_data', {})

        user = User.objects.create_user(
            username=username,
            email=email,
            phone_number=validated_data['phone_number'],
            first_name=validated_data.get('first_name', first_name),
            last_name=validated_data.get('last_name', last_name),
            role=validated_data.get('role', 'buyer'),
            location=validated_data.get('location', ''),
            latitude=validated_data.get('latitude'),
            longitude=validated_data.get('longitude'),
            password=validated_data['password']
        )

        if user.role == 'farmer':
            FarmerProfile.objects.create(
                user=user,
                farm_size=profile_data.get('farm_size'),
                farming_type=profile_data.get('farming_type', ''),
                certifications=profile_data.get('certifications', '')
            )
        elif user.role == 'buyer':
            BuyerProfile.objects.create(
                user=user,
                business_name=profile_data.get('business_name', ''),
                buyer_type=profile_data.get('buyer_type', '')
            )
        elif user.role == 'creditor':
            from smc_backend.apps.credit.models import CreditorProfile
            CreditorProfile.objects.create(
                creditor=user,
                institution_name=profile_data.get('institution_name', user.get_full_name() or "Lending Institution"),
                description=profile_data.get('description', ''),
                interest_rate_prime=profile_data.get('interest_rate_prime', 8.0),
                interest_rate_low=profile_data.get('interest_rate_low', 12.0),
                interest_rate_medium=profile_data.get('interest_rate_medium', 16.0),
                interest_rate_high=profile_data.get('interest_rate_high', 22.0),
                min_loan_amount=profile_data.get('min_loan_amount', 5000),
                max_loan_amount=profile_data.get('max_loan_amount', 1000000),
                is_accepting_applications=True,
            )

        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False)
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, data):
        """Authenticate user."""
        identifier = data.get('username') or data.get('email')
        if not identifier:
            raise serializers.ValidationError('Username or email is required.')

        if data.get('email'):
            user_obj = User.objects.filter(email__iexact=data['email']).first()
        else:
            user_obj = User.objects.filter(username__iexact=data['username']).first()

        if not user_obj:
            raise serializers.ValidationError('Invalid username or password.')

        user = authenticate(
            username=user_obj.username,
            password=data['password']
        )
        if not user:
            raise serializers.ValidationError(
                'Invalid username or password.'
            )
        if not user.is_active:
            raise serializers.ValidationError(
                'This account has been disabled.'
            )
        if data.get('role') and user.role != data['role']:
            raise serializers.ValidationError('Selected role does not match this account.')
        data['user'] = user
        return data


class UserDetailSerializer(serializers.ModelSerializer):
    """Serializer for user profile details."""

    full_name = serializers.SerializerMethodField()
    phone = serializers.CharField(source='phone_number', read_only=True)
    farmer_profile = FarmerProfileSerializer(read_only=True)
    buyer_profile = BuyerProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone_number', 'phone', 'role',
            'first_name', 'last_name', 'profile_image', 'bio',
            'location', 'latitude', 'longitude',
            'farmer_profile', 'buyer_profile',
            'full_name', 'is_verified', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_verified']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for listing users (public info only)."""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'role', 'profile_image', 'bio', 'location'
        ]
        read_only_fields = fields


class StaffLogSerializer(serializers.ModelSerializer):
    """Serializer for farmer staff work logs."""

    class Meta:
        model = StaffLog
        fields = [
            'id', 'farmer', 'staff_name', 'role', 'hours', 'date',
            'rate_per_hour', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'farmer', 'created_at', 'updated_at']


class ContactInquirySerializer(serializers.ModelSerializer):
    """Serializer for public contact form submissions."""

    class Meta:
        model = ContactInquiry
        fields = [
            'id', 'user', 'name', 'email', 'subject', 'message',
            'status', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'status', 'created_at']


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password inside a profile session."""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "New passwords do not match."})
        return data
