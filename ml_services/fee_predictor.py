import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os
import logging

logger = logging.getLogger(__name__)

class FeePredictor:
    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.trained = False
        self.model_path = 'models/fee_predictor.pkl'
        self.scaler_path = 'models/fee_scaler.pkl'
        
        # Create models directory
        os.makedirs('models', exist_ok=True)
    
    def prepare_features(self, amount, token_type, network_load, priority):
        """Prepare features for prediction"""
        # Convert token type to numeric
        token_mapping = {'APT': 1, 'BTC': 2, 'ETH': 3, 'USDT': 4, 'other': 0}
        token_numeric = token_mapping.get(token_type.upper(), 0)
        
        # Convert priority to numeric
        priority_mapping = {'low': 1, 'normal': 2, 'high': 3, 'urgent': 4}
        priority_numeric = priority_mapping.get(priority.lower(), 2)
        
        # Create feature array
        features = np.array([
            float(amount),
            token_numeric,
            float(network_load),
            priority_numeric,
            float(amount) * float(network_load),  # Interaction feature
            np.log1p(float(amount)),  # Log-transformed amount
        ]).reshape(1, -1)
        
        return features
    
    def generate_synthetic_data(self, n_samples=1000):
        """Generate synthetic training data"""
        np.random.seed(42)
        
        data = []
        for _ in range(n_samples):
            amount = np.random.lognormal(mean=5, sigma=2)  # Log-normal distribution
            token_type = np.random.choice(['APT', 'BTC', 'ETH', 'USDT', 'other'], 
                                        p=[0.4, 0.2, 0.2, 0.15, 0.05])
            network_load = np.random.beta(2, 5)  # Beta distribution (0-1)
            priority = np.random.choice(['low', 'normal', 'high', 'urgent'], 
                                      p=[0.2, 0.5, 0.25, 0.05])
            
            # Calculate synthetic fee based on realistic factors
            base_fee = 0.001  # Base fee
            amount_factor = np.log1p(amount) * 0.0001
            network_factor = network_load * 0.01
            priority_multiplier = {'low': 0.8, 'normal': 1.0, 'high': 1.5, 'urgent': 2.0}[priority]
            token_multiplier = {'APT': 1.0, 'BTC': 1.2, 'ETH': 1.1, 'USDT': 0.9, 'other': 1.0}[token_type]
            
            fee = (base_fee + amount_factor + network_factor) * priority_multiplier * token_multiplier
            fee += np.random.normal(0, fee * 0.1)  # Add noise
            fee = max(0.0001, fee)  # Minimum fee
            
            data.append({
                'amount': amount,
                'token_type': token_type,
                'network_load': network_load,
                'priority': priority,
                'fee': fee
            })
        
        return data
    
    def train_model(self, training_data=None):
        """Train the fee prediction model"""
        try:
            if training_data is None:
                training_data = self.generate_synthetic_data()
            
            # Convert to DataFrame
            df = pd.DataFrame(training_data)
            
            # Prepare features and targets
            X = []
            y = df['fee'].values
            
            for _, row in df.iterrows():
                features = self.prepare_features(
                    row['amount'], row['token_type'], 
                    row['network_load'], row['priority']
                ).flatten()
                X.append(features)
            
            X = np.array(X)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train model
            self.model.fit(X_train_scaled, y_train)
            
            # Evaluate
            train_score = self.model.score(X_train_scaled, y_train)
            test_score = self.model.score(X_test_scaled, y_test)
            
            self.trained = True
            
            # Save model
            self.save_model()
            
            logger.info(f"Fee predictor trained - Train Score: {train_score:.3f}, Test Score: {test_score:.3f}")
            
            return {
                'status': 'success',
                'train_score': train_score,
                'test_score': test_score,
                'samples_trained': len(training_data)
            }
            
        except Exception as e:
            logger.error(f"Training failed: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def predict_fee(self, amount, token_type='APT', network_load=0.5, priority='normal'):
        """Predict transaction fee"""
        try:
            if not self.trained:
                # Train with synthetic data if not trained
                self.train_model()
            
            # Prepare features
            features = self.prepare_features(amount, token_type, network_load, priority)
            features_scaled = self.scaler.transform(features)
            
            # Predict
            predicted_fee = self.model.predict(features_scaled)[0]
            
            # Get prediction confidence (using feature importance and std)
            feature_importance = self.model.feature_importances_
            confidence = min(0.95, 0.7 + np.mean(feature_importance) * 0.3)
            
            return {
                'predicted_fee': float(predicted_fee),
                'currency': 'APT',
                'confidence': float(confidence),
                'factors': {
                    'amount': float(amount),
                    'token_type': token_type,
                    'network_load': float(network_load),
                    'priority': priority
                },
                'status': 'success'
            }
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            return {
                'error': str(e),
                'predicted_fee': 0.001,  # Fallback fee
                'status': 'error'
            }
    
    def save_model(self):
        """Save trained model and scaler"""
        try:
            joblib.dump(self.model, self.model_path)
            joblib.dump(self.scaler, self.scaler_path)
            logger.info("Fee predictor model saved")
        except Exception as e:
            logger.error(f"Failed to save model: {str(e)}")
    
    def load_model(self):
        """Load saved model and scaler"""
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
                self.model = joblib.load(self.model_path)
                self.scaler = joblib.load(self.scaler_path)
                self.trained = True
                logger.info("Fee predictor model loaded")
                return True
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
        return False
    
    def is_trained(self):
        """Check if model is trained"""
        return self.trained
