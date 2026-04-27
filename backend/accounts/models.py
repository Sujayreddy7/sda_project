from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
import pyotp

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Membership Tier
    TIER_CHOICES = (
        ('FREE', 'Free'),
        ('BASIC', 'Basic'),
        ('PREMIUM', 'Premium'),
    )
    membership_tier = models.CharField(max_length=10, choices=TIER_CHOICES, default='FREE')
    
    # MFA Logic
    mfa_secret = models.CharField(max_length=32, blank=True, null=True)
    mfa_enabled = models.BooleanField(default=False)

    def generate_mfa_secret(self):
        self.mfa_secret = pyotp.random_base32()
        self.save()
        return self.mfa_secret

    def verify_mfa(self, token):
        if not self.mfa_secret:
            return False
        totp = pyotp.TOTP(self.mfa_secret)
        return totp.verify(token)

    def get_totp_uri(self):
        if not self.mfa_secret:
            self.generate_mfa_secret()
        return pyotp.totp.TOTP(self.mfa_secret).provisioning_uri(
            name=self.user.email,
            issuer_name="SDA Web App"
        )
        
    def __str__(self):
        return f"{self.user.username} Profile"

# Signals to automatically create/save UserProfile when a User is created/saved
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()
