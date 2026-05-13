from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from smc_backend.apps.ai_agent.services import predict_market_price, get_weather

User = get_user_model()

class AIAgentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testfarmer', password='password', role='farmer')
        self.client.force_authenticate(user=self.user)

    def test_predict_market_price(self):
        # The logic has random factors, but we can verify formatting
        prediction = predict_market_price("maize", "Nairobi")
        self.assertIn("Predicted Price: KES", prediction)
        self.assertIn("Change:", prediction)
        self.assertIn("Confidence:", prediction)
        self.assertIn("Reason:", prediction)
        
    def test_get_weather(self):
        weather_nbi = get_weather("nairobi")
        self.assertIn("Sunny", weather_nbi)
        
        weather_unk = get_weather("unknown")
        self.assertIn("Weather for unknown:", weather_unk)

    def test_predict_price_endpoint(self):
        response = self.client.get(reverse('ai-predict-price'), {'crop': 'beans', 'location': 'Nakuru'})
        self.assertEqual(response.status_code, 200)
        self.assertIn("prediction", response.data)
        self.assertIn("Predicted Price: KES", response.data["prediction"])

    def test_market_insights_endpoint(self):
        response = self.client.get(reverse('ai-market-insights'))
        self.assertEqual(response.status_code, 200)
        self.assertIn("insights", response.data)
        self.assertTrue(len(response.data["insights"]) > 0)
