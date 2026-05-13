"""
Credit scoring ML model training and prediction.
Uses scikit-learn for a deterministic yet learnable model.
"""

import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from datetime import datetime, timedelta


class CreditScoringModel:
    """
    Machine learning model for credit scoring.
    
    Features:
    - Cashflow Reliability (40%): transaction frequency, success rate
    - Consistency (30%): activity regularity, platform tenure
    - Proof of Sale (30%): sales volume, transaction history
    """
    
    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            random_state=42,
            n_jobs=-1
        )
        self.scaler = StandardScaler()
        self.feature_names = [
            'transaction_count_30d',
            'transaction_count_90d',
            'success_rate',
            'avg_transaction_value',
            'days_since_first_transaction',
            'days_since_last_transaction',
            'products_listed_count',
            'active_products_count',
            'bids_received_count',
            'bids_accepted_count',
            'reviews_count',
            'average_rating',
            'total_sales_volume',
            'consistency_score'
        ]
        self.model_path = os.path.join(
            os.path.dirname(__file__),
            'credit_model.pkl'
        )
    
    def extract_features(self, farmer_analytics, user, transactions):
        """
        Extract features from farmer data.
        
        Args:
            farmer_analytics: FarmerAnalytics instance
            user: User instance
            transactions: QuerySet of transactions
        
        Returns:
            numpy array of features
        """
        
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        ninety_days_ago = now - timedelta(days=90)
        
        # Cashflow features
        txn_30d = transactions.filter(created_at__gte=thirty_days_ago).count()
        txn_90d = transactions.filter(created_at__gte=ninety_days_ago).count()
        
        completed_txns = transactions.filter(status='completed')
        success_rate = (
            (completed_txns.count() / transactions.count() * 100)
            if transactions.count() > 0 else 0
        )
        
        avg_value = (
            farmer_analytics.total_revenue / farmer_analytics.total_sales_count
            if farmer_analytics.total_sales_count > 0 else 0
        )
        
        # Consistency features
        first_txn = transactions.order_by('created_at').first()
        days_since_first = (
            (now - first_txn.created_at).days
            if first_txn else 0
        )
        
        last_txn = transactions.order_by('-created_at').first()
        days_since_last = (
            (now - last_txn.created_at).days
            if last_txn else 365
        )
        
        # Activity consistency (0-100)
        # More active = higher score
        consistency = min(100, txn_90d * 10)
        
        # Sales volume features
        total_sales = float(farmer_analytics.total_revenue)
        
        features = np.array([
            txn_30d,
            txn_90d,
            success_rate,
            float(avg_value),
            days_since_first,
            days_since_last,
            farmer_analytics.total_products_listed,
            farmer_analytics.active_products,
            farmer_analytics.total_bids_received,
            farmer_analytics.bids_accepted,
            farmer_analytics.total_reviews,
            farmer_analytics.average_rating,
            total_sales,
            consistency
        ]).reshape(1, -1)
        
        return features
    
    def predict_score(self, features):
        """
        Predict credit score (0-100).
        
        Args:
            features: numpy array of features
        
        Returns:
            credit score (0-100)
        """
        
        if not hasattr(self, 'model') or self.model is None:
            self.load_model()
        
        # Scale features
        scaled_features = self.scaler.transform(features)
        
        # Predict raw score
        raw_score = self.model.predict(scaled_features)[0]
        
        # Normalize to 0-100
        score = max(0, min(100, raw_score))
        
        return float(score)
    
    def predict_risk_category(self, score):
        """
        Categorize risk based on score.
        
        Args:
            score: Credit score (0-100)
        
        Returns:
            Risk category: 'low', 'medium', or 'high'
        """
        
        if score >= 75:
            return 'low'
        elif score >= 50:
            return 'medium'
        else:
            return 'high'
    
    def predict_interest_rate(self, score):
        """
        Calculate interest rate based on risk.
        
        Args:
            score: Credit score (0-100)
        
        Returns:
            Interest rate (percentage per annum)
        """
        
        # Base rate: 15% annual
        # Low risk: 8%, Medium risk: 12%, High risk: 18%
        
        if score >= 75:
            return 8.0
        elif score >= 50:
            return 12.0
        else:
            return 18.0
    
    def predict_credit_limit(self, farmer_analytics, score):
        """
        Calculate recommended credit limit based on history and score.
        
        Args:
            farmer_analytics: FarmerAnalytics instance
            score: Credit score (0-100)
        
        Returns:
            Recommended credit limit (in currency units)
        """
        
        base_limit = float(farmer_analytics.total_revenue) * 0.5
        
        # Adjust by score
        if score >= 75:
            multiplier = 2.0  # 2x average sales
        elif score >= 50:
            multiplier = 1.0  # 1x average sales
        else:
            multiplier = 0.5  # 0.5x average sales
        
        recommended_limit = base_limit * multiplier
        
        # Minimum: 10,000, Maximum: 1,000,000
        return max(10000, min(1000000, recommended_limit))
    
    def train_on_historical_data(self, training_data, labels):
        """
        Train model on historical data.
        
        Args:
            training_data: numpy array of features
            labels: numpy array of credit scores (0-100)
        """
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            training_data, labels,
            test_size=0.2,
            random_state=42
        )
        
        # Scale features
        self.scaler.fit(X_train)
        X_train_scaled = self.scaler.transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        train_score = self.model.score(X_train_scaled, y_train)
        test_score = self.model.score(X_test_scaled, y_test)
        
        print(f"Training score: {train_score:.3f}")
        print(f"Testing score: {test_score:.3f}")
        
        # Save model
        self.save_model()
    
    def save_model(self):
        """Save model to disk."""
        with open(self.model_path, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'scaler': self.scaler,
                'feature_names': self.feature_names
            }, f)
        print(f"Model saved to {self.model_path}")
    
    def load_model(self):
        """Load model from disk."""
        if os.path.exists(self.model_path):
            with open(self.model_path, 'rb') as f:
                data = pickle.load(f)
                self.model = data['model']
                self.scaler = data['scaler']
                self.feature_names = data['feature_names']
            print(f"Model loaded from {self.model_path}")
        else:
            print(f"No model found at {self.model_path}")
            # Initialize with default model
            self.scaler.fit(np.random.rand(10, 14))


# Global instance
credit_model = CreditScoringModel()


def calculate_credit_score(farmer, analytics, transactions):
    """
    Calculate credit score for a farmer.
    
    Args:
        farmer: User instance (farmer)
        analytics: FarmerAnalytics instance
        transactions: QuerySet of transactions
    
    Returns:
        dict with score, risk category, interest rate, credit limit
    """
    
    features = credit_model.extract_features(analytics, farmer, transactions)
    score = credit_model.predict_score(features)
    risk = credit_model.predict_risk_category(score)
    interest_rate = credit_model.predict_interest_rate(score)
    credit_limit = credit_model.predict_credit_limit(analytics, score)
    
    return {
        'score': score,
        'risk_category': risk,
        'interest_rate': interest_rate,
        'recommended_credit_limit': credit_limit
    }
