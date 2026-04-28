"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from core.views import GoogleLoginView, CustomTokenObtainPairView, RegisterView

@api_view(['GET'])
def hello_api(request):
    return Response({"message": "Hello from Django backend! Backend is successfully connected."})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/hello/', hello_api, name="hello-api"),
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/google-login/', GoogleLoginView.as_view(), name='google_login'),
    path('api/accounts/', include('accounts.urls')),
    path('api/', include('todos.urls')),
]
