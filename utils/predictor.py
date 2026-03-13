import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import os

class GoldStockPredictor:
    def __init__(self):
        """Initialize the predictor with trained model and scaler"""
        self.model_path = 'models/best_model_linear_regression.pkl'
        self.scaler_path = 'models/feature_scaler.pkl'
        self.feature_names_path = 'models/feature_names.txt'
        
        # Load model and scaler
        self.load_model()
    
    def load_model(self):
        """Load the trained model and scaler"""
        try:
            self.model = joblib.load(self.model_path)
            self.scaler = joblib.load(self.scaler_path)
            
            # Load feature names
            with open(self.feature_names_path, 'r') as f:
                self.feature_names = [line.strip() for line in f.readlines()]
            
            print("✅ Model and scaler loaded successfully!")
        except Exception as e:
            print(f"⚠️  Error loading model: {e}")
            self.model = None
            self.scaler = None
            self.feature_names = []
    
    def engineer_features(self, data):
        """Create engineered features from input data"""
        # Parse date if provided
        if 'Date' in data:
            date = pd.to_datetime(data['Date'])
            day = date.day
            month = date.month
            year = date.year
            day_of_week = date.dayofweek
            quarter = date.quarter
        else:
            # Use current date if not provided
            date = datetime.now()
            day = date.day
            month = date.month
            year = date.year
            day_of_week = date.weekday()
            quarter = (month - 1) // 3 + 1
        
        # Calculate technical indicators
        open_price = data['Open']
        high_price = data['High']
        low_price = data['Low']
        volume = data['Volume']
        
        price_range = high_price - low_price
        price_change = data.get('Close', open_price) - open_price
        price_change_pct = (price_change / open_price) * 100 if open_price != 0 else 0
        
        # For lag features, use Open price as approximation if not provided
        close_lag1 = data.get('Close_Lag1', open_price * 0.99)
        close_lag2 = data.get('Close_Lag2', open_price * 0.98)
        volume_lag1 = data.get('Volume_Lag1', volume * 0.95)
        
        # Calculate moving averages (approximate if not provided)
        ma_5 = data.get('MA_5', open_price)
        ma_10 = data.get('MA_10', open_price)
        
        # Create feature dictionary
        features = {
            'Open': open_price,
            'High': high_price,
            'Low': low_price,
            'Volume': volume,
            'Day': day,
            'Month': month,
            'Year': year,
            'DayOfWeek': day_of_week,
            'Quarter': quarter,
            'Price_Range': price_range,
            'Price_Change': price_change,
            'Price_Change_Pct': price_change_pct,
            'Close_Lag1': close_lag1,
            'Close_Lag2': close_lag2,
            'Volume_Lag1': volume_lag1,
            'MA_5': ma_5,
            'MA_10': ma_10
        }
        
        return features
    
    def predict(self, input_data):
        """Make prediction on input data"""
        try:
            # Engineer features
            features = self.engineer_features(input_data)
            
            # Create DataFrame with correct feature order
            feature_df = pd.DataFrame([features])
            feature_df = feature_df[self.feature_names]
            
            # Scale features
            features_scaled = self.scaler.transform(feature_df)
            
            # Make prediction
            prediction = self.model.predict(features_scaled)[0]
            
            # Calculate confidence metrics
            confidence = self.calculate_confidence(features, prediction)
            
            # Prepare result
            result = {
                'predicted_price': round(prediction, 2),
                'confidence': confidence,
                'input_features': features,
                'prediction_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'model_name': 'Linear Regression',
                'status': 'success'
            }
            
            return result
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def calculate_confidence(self, features, prediction):
        """Calculate prediction confidence score"""
        # Simple confidence calculation based on feature ranges
        # In production, you might use prediction intervals or ensemble methods
        
        open_price = features['Open']
        price_range = features['Price_Range']
        
        # Calculate relative price range
        relative_range = (price_range / open_price) * 100 if open_price != 0 else 0
        
        # Higher confidence for smaller relative ranges
        if relative_range < 1:
            confidence = 95
        elif relative_range < 2:
            confidence = 90
        elif relative_range < 3:
            confidence = 85
        else:
            confidence = 80
        
        return confidence
    
    def get_model_info(self):
        """Get information about the loaded model"""
        if self.model is None:
            return {'error': 'Model not loaded'}
        
        return {
            'model_type': type(self.model).__name__,
            'features_count': len(self.feature_names),
            'features': self.feature_names,
            'model_loaded': True
        }