import os
import requests
import base64
from datetime import datetime

with open('.env') as f:
    env_vars = {}
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env_vars[k.strip()] = v.strip()

consumer_key = env_vars.get('MPESA_CONSUMER_KEY')
consumer_secret = env_vars.get('MPESA_CONSUMER_SECRET')
base_url = env_vars.get('MPESA_BASE_URL', 'https://sandbox.safaricom.co.ke')
ngrok_url = env_vars.get('NGROK_URL', 'https://mydomain.com')

print(f"Key: {consumer_key}")
print(f"Secret: {consumer_secret}")

auth_url = f"{base_url}/oauth/v1/generate?grant_type=client_credentials"
try:
    auth_response = requests.get(auth_url, auth=(consumer_key, consumer_secret), timeout=10)
    auth_response.raise_for_status()
    access_token = auth_response.json().get('access_token')
    print("Auth Success")
except Exception as e:
    print(f"Auth failed: {str(e)}")
    print(auth_response.text)
    import sys
    sys.exit(1)

shortcode = '174379'
passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
password_str = f"{shortcode}{passkey}{timestamp}"
password_b64 = base64.b64encode(password_str.encode('utf-8')).decode('utf-8')

stk_url = f"{base_url}/mpesa/stkpush/v1/processrequest"
headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

callback_url = f"{ngrok_url.rstrip('/')}/api/payments/mpesa/callback/"

payload = {
    "BusinessShortCode": shortcode,
    "Password": password_b64,
    "Timestamp": timestamp,
    "TransactionType": "CustomerPayBillOnline",
    "Amount": 1,
    "PartyA": "254708374149",
    "PartyB": shortcode,
    "PhoneNumber": "254708374149",
    "CallBackURL": callback_url,
    "AccountReference": "SMC",
    "TransactionDesc": "SMC Payment"
}

try:
    print(f"Sending STK Push with Payload: {payload}")
    stk_response = requests.post(stk_url, headers=headers, json=payload, timeout=10)
    print(f"Status: {stk_response.status_code}")
    print(f"Response: {stk_response.text}")
except Exception as e:
    print(f"STK Error: {str(e)}")
