from django.urls import path
from .views import CreateRazorpayOrderView, VerifyRazorpayPaymentView
from .mfa_views import MfaSetupView, MfaEnableView, MfaDisableView

urlpatterns = [
    path('payments/create-order/', CreateRazorpayOrderView.as_view(), name='create_order'),
    path('payments/verify/', VerifyRazorpayPaymentView.as_view(), name='verify_payment'),
    path('mfa/setup/', MfaSetupView.as_view(), name='mfa_setup'),
    path('mfa/enable/', MfaEnableView.as_view(), name='mfa_enable'),
    path('mfa/disable/', MfaDisableView.as_view(), name='mfa_disable'),
]

