import qrcode
import base64
from io import BytesIO
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

class MfaSetupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = request.user.profile
        # Generate new secret if not enabled, or if they want to reset
        if profile.mfa_enabled:
            return Response({"error": "MFA is already enabled."}, status=status.HTTP_400_BAD_REQUEST)
            
        uri = profile.get_totp_uri()
        
        # Generate QR Code image
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return Response({
            "secret": profile.mfa_secret,
            "qr_code": f"data:image/png;base64,{img_str}"
        })

class MfaEnableView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({"error": "MFA token is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        profile = request.user.profile
        if profile.verify_mfa(token):
            profile.mfa_enabled = True
            profile.save()
            return Response({"message": "MFA enabled successfully."})
        else:
            return Response({"error": "Invalid MFA token."}, status=status.HTTP_400_BAD_REQUEST)

class MfaDisableView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Require a valid token to disable, for security
        token = request.data.get('token')
        profile = request.user.profile
        
        if not profile.mfa_enabled:
            return Response({"error": "MFA is not enabled."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not token:
            return Response({"error": "MFA token is required to disable MFA."}, status=status.HTTP_400_BAD_REQUEST)
            
        if profile.verify_mfa(token):
            profile.mfa_enabled = False
            profile.mfa_secret = None  # Clear the secret so it must be set up again
            profile.save()
            return Response({"message": "MFA disabled successfully."})
        else:
            return Response({"error": "Invalid MFA token."}, status=status.HTTP_400_BAD_REQUEST)
