"""
AI Agent REST endpoints.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .services import predict_market_price, generate_credit_risk_summary

class PredictPriceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        crop = request.query_params.get('crop', 'maize')
        location = request.query_params.get('location', 'Nairobi')
        
        prediction = predict_market_price(crop, location)
        return Response({"prediction": prediction}, status=status.HTTP_200_OK)


class MarketInsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # A summary of top crops
        insights = []
        for crop in ["maize", "beans", "tomatoes"]:
            insights.append(predict_market_price(crop, "Nairobi"))
        return Response({"insights": insights}, status=status.HTTP_200_OK)


class CreditScorePredictionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        username = request.query_params.get('username')
        if not username:
            return Response({"error": "username parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Optional: restrict to creditor/admin roles
        if request.user.role not in ['creditor', 'admin']:
            return Response({"error": "Unauthorized role"}, status=status.HTTP_403_FORBIDDEN)
            
        summary = generate_credit_risk_summary(username)
        return Response({"credit_summary": summary}, status=status.HTTP_200_OK)
