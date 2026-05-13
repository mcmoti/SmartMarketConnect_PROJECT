"""
Views for M-Pesa payment integration.
"""

from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json
import requests
from django.conf import settings
from datetime import datetime
import base64
import os

from smc_backend.apps.transactions.models import Transaction


class MpesaSTKPushView(APIView):
    """
    Initiate M-Pesa STK Push for payment using Safaricom Daraja API.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        from .serializers import MpesaSTKPushSerializer
        
        serializer = MpesaSTKPushSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        phone = serializer.validated_data['phone_number']
        
        # M-Pesa requires phone numbers in the format 254XXXXXXXXX
        phone = str(phone).strip('+').replace(' ', '')
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif phone.startswith('7') or phone.startswith('1'):
            phone = '254' + phone
            
        amount = serializer.validated_data['amount']
        reference = request.data.get('reference', '')
        transaction_type = request.data.get('transaction_type', 'cart_purchase')
        
        # Create pending transaction
        transaction = Transaction.objects.create(
            user=request.user,
            amount=amount,
            transaction_type=transaction_type,
            status='pending',
            description=f"M-Pesa payment for {transaction_type}"
        )
        
        # Daraja API Integration
        consumer_key = getattr(settings, 'MPESA_CONSUMER_KEY', None)
        consumer_secret = getattr(settings, 'MPESA_CONSUMER_SECRET', None)

        if consumer_key: consumer_key = consumer_key.strip()
        if consumer_secret: consumer_secret = consumer_secret.strip()
        
        base_url = getattr(settings, 'MPESA_BASE_URL', 'https://sandbox.safaricom.co.ke')
        
        if not consumer_key or not consumer_secret:
            return Response({'error': 'M-Pesa credentials not configured.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        auth_url = f"{base_url}/oauth/v1/generate?grant_type=client_credentials"
        try:
            auth_response = requests.get(auth_url, auth=(consumer_key, consumer_secret), timeout=10)
            auth_response.raise_for_status()
            access_token = auth_response.json().get('access_token')
        except Exception as e:
            return Response({'error': f'Auth failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        shortcode = getattr(settings, 'MPESA_SHORTCODE', '174379')
        if shortcode == 'N/A':
            shortcode = '174379'
        passkey = getattr(settings, 'MPESA_PASSKEY', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919')
        if passkey == 'N/A':
            passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
            
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password_str = f"{shortcode}{passkey}{timestamp}"
        password_b64 = base64.b64encode(password_str.encode('utf-8')).decode('utf-8')
        
        stk_url = f"{base_url}/mpesa/stkpush/v1/processrequest"
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        # Determine API amount (M-Pesa requires integer amount >= 1 in production, but zero for this dev)
        # Sandbox sometimes rejects 0. If testing requires 0, we send 0. Otherwise, at least 1.
        api_amount = int(amount)
        if api_amount < 1:
            api_amount = 1 # sandbox requires at least 1 for STK usually
            
        # Dynamically read .env to avoid needing a server restart when URL changes
        import environ
        env = environ.Env()
        env_file = os.path.join(settings.BASE_DIR, '.env')
        if os.path.exists(env_file):
            environ.Env.read_env(env_file)
            
        ngrok_url = env.str('NGROK_URL', default='https://mydomain.com')
        callback_url = f"{ngrok_url.rstrip('/')}/api/payments/mpesa/callback/"
            
        payload = {
            "BusinessShortCode": shortcode,
            "Password": password_b64,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": api_amount,
            "PartyA": phone,
            "PartyB": shortcode,
            "PhoneNumber": phone,
            "CallBackURL": callback_url,
            "AccountReference": str(reference)[:12] if reference else "SMC",
            "TransactionDesc": "SMC Payment"
        }
        
        try:
            stk_response = requests.post(stk_url, headers=headers, json=payload, timeout=10)
            stk_data = stk_response.json()
            
            if stk_response.status_code == 200 and stk_data.get('ResponseCode') == '0':
                return Response({
                    'CheckoutRequestID': stk_data.get('CheckoutRequestID'),
                    'ResponseCode': stk_data.get('ResponseCode'),
                    'ResponseDescription': stk_data.get('ResponseDescription'),
                    'CustomerMessage': stk_data.get('CustomerMessage'),
                    'transaction_id': transaction.id,
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'STK Push failed',
                    'details': stk_data
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class MpesaCallbackView(APIView):
    """
    Handle M-Pesa callback for payment status.
    Webhook endpoint that M-Pesa calls to update transaction status.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """
        Process M-Pesa callback.
        
        M-Pesa sends callback data with payment status.
        """
        try:
            # Parse M-Pesa callback
            callback_data = request.data.get('Body', {})
            result = callback_data.get('stkCallback', {})
            
            checkout_request_id = result.get('CheckoutRequestID')
            result_code = result.get('ResultCode')
            result_desc = result.get('ResultDesc')
            callback_metadata = result.get('CallbackMetadata', {})
            
            # Extract transaction ID from CheckoutRequestID
            # Format: mock_{transaction_id}_{timestamp}
            if 'mock_' in str(checkout_request_id):
                transaction_id = int(str(checkout_request_id).split('_')[1])
            else:
                transaction_id = None
            
            if not transaction_id:
                return Response(
                    {'ResultCode': 1, 'ResultDesc': 'Invalid transaction'},
                    status=status.HTTP_200_OK
                )
            
            transaction = Transaction.objects.get(id=transaction_id)
            
            # Result code 0 = Success
            if result_code == 0:
                transaction.status = 'completed'
                transaction.completed_at = datetime.now()
                
                # Extract M-Pesa reference from metadata
                items = callback_metadata.get('Item', [])
                for item in items:
                    if item.get('Name') == 'MpesaReceiptNumber':
                        transaction.mpesa_reference = item.get('Value')
            else:
                transaction.status = 'failed'
            
            transaction.save()
            
            # Return success response to M-Pesa
            return Response(
                {'ResultCode': 0, 'ResultDesc': 'Received'},
                status=status.HTTP_200_OK
            )
        
        except Exception as e:
            return Response(
                {'ResultCode': 1, 'ResultDesc': str(e)},
                status=status.HTTP_200_OK
            )
