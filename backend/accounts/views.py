from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
import razorpay
import os

from .models import UserProfile

class CreateRazorpayOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        amount = request.data.get('amount')
        tier = request.data.get('tier')  # e.g., 'BASIC', 'PREMIUM'

        if not amount or not tier:
            return Response({"error": "amount and tier are required."}, status=status.HTTP_400_BAD_REQUEST)

        key_id = os.environ.get('RAZORPAY_KEY_ID')
        key_secret = os.environ.get('RAZORPAY_KEY_SECRET')
        
        try:
            client = razorpay.Client(auth=(key_id, key_secret))
            order_data = {
                "amount": int(amount) * 100, 
                "currency": "INR",
                "receipt": f"receipt_{request.user.id}_{tier}",
            }
            order = client.order.create(data=order_data)
            return Response(order, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyRazorpayPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_id = request.data.get('razorpay_payment_id')
        order_id = request.data.get('razorpay_order_id')
        signature = request.data.get('razorpay_signature')
        tier = request.data.get('tier')

        if not all([payment_id, order_id, signature, tier]):
            return Response({"error": "Missing payment signature details."}, status=status.HTTP_400_BAD_REQUEST)

        key_id = os.environ.get('RAZORPAY_KEY_ID')
        key_secret = os.environ.get('RAZORPAY_KEY_SECRET')
        
        try:
            client = razorpay.Client(auth=(key_id, key_secret))
            client.utility.verify_payment_signature({
                'razorpay_order_id': order_id,
                'razorpay_payment_id': payment_id,
                'razorpay_signature': signature
            })
            
            profile = request.user.profile
            profile.membership_tier = tier.upper()
            profile.save()
            return Response({"message": f"Successfully upgraded to {tier} tier."}, status=status.HTTP_200_OK)
        except razorpay.errors.SignatureVerificationError:
            return Response({"error": "Payment verification failed."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
