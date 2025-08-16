import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
import joblib
import os
import logging
import time

logger = logging.getLogger(__name__)

class FraudDetector:
    def __init__(self):
        self.anomaly_model = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        self.classification_model = RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.trained = False
        self.anomaly_model_path = 'models/fraud_anomaly.pkl'
        self.classification_model_path = 'models/fraud_classifier.pkl'
        self.scaler_path = 'models/fraud_scaler.pkl'
        
        # Create models directory
        os.makedirs('models', exist_ok=True)
    
    def extract_features(self, sender, recipient, amount, timestamp):
        """Extract features from transaction data"""
        current_time = time.time()
        
        # Basic features
        amount_float = float(amount) if amount else 0.0
        sender_len = len(str(sender))
        recipient_len = len(str(recipient))
        
        # Address analysis
        sender_entropy = self._calculate_entropy(str(sender))
        recipient_entropy = self._calculate_entropy(str(recipient))
        address_similarity = self._address_similarity(str(sender), str(recipient))
        
        # Amount analysis
        amount_log = np.log1p(amount_float)
        is_round_amount = 1 if amount_float in [10, 50, 100, 500, 1000, 5000, 10000] else 0
        
        # Time analysis
        time_diff = current_time - timestamp if timestamp else 0
        is_future = 1 if timestamp > current_time + 300 else 0  # 5 min tolerance
        is_old = 1 if time_diff > 86400 * 7 else 0  # 1 week old
        
        # Time of day (assuming UTC)
        hour_of_day = int((timestamp % 86400) / 3600) if timestamp else 12
        is_night = 1 if hour_of_day < 6 or hour_of_day > 22 else 0
        
        # Pattern detection
        is_self_transaction = 1 if str(sender) == str(recipient) else 0
        has_repeated_chars = self._has_repeated_pattern(str(sender)) or self._has_repeated_pattern(str(recipient))
        
        features = np.array([
            amount_float,
            amount_log,
            sender_len,
            recipient_len,
            sender_entropy,
            recipient_entropy,
            address_similarity,
            is_round_amount,
            time_diff,
            is_future,
            is_old,
            hour_of_day,
            is_night,
            is_self_transaction,
            has_repeated_chars,
            amount_float / max(sender_len, 1),  # Amount per sender char
            amount_float / max(recipient_len, 1),  # Amount per recipient char
        ])
        
        return features.reshape(1, -1)
    
    def _calculate_entropy(self, address):
        """Calculate Shannon entropy of an address"""
        if not address:
            return 0
        
        _, counts = np.unique(list(address), return_counts=True)
        probabilities = counts / len(address)
        entropy = -np.sum(probabilities * np.log2(probabilities + 1e-10))
        return entropy
    
    def _address_similarity(self, addr1, addr2):
        """Calculate similarity between two addresses"""
        if not addr1 or not addr2 or len(addr1) != len(addr2):
            return 0
        
        matches = sum(1 for a, b in zip(addr1, addr2) if a == b)
        return matches / len(addr1)
    
    def _has_repeated_pattern(self, address):
        """Check if address has repeated patterns"""
        if len(address) < 4:
            return 0
        
        # Check for repeated 2-char patterns
        for i in range(len(address) - 3):
            pattern = address[i:i+2]
            if address.count(pattern) >= 3:
                return 1
        
        # Check for sequential repetition
        for i in range(len(address) - 5):
            if address[i] == address[i+1] == address[i+2]:
                return 1
        
        return 0
    
    def generate_synthetic_data(self, n_samples=2000):
        """Generate synthetic fraud detection training data"""
        np.random.seed(42)
        
        data = []
        
        # Generate normal transactions (80%)
        for _ in range(int(n_samples * 0.8)):
            amount = np.random.lognormal(mean=3, sigma=1.5)
            sender = self._generate_address(suspicious=False)
            recipient = self._generate_address(suspicious=False)
            timestamp = time.time() - np.random.uniform(0, 86400 * 30)  # Last 30 days
            
            data.append({
                'sender': sender,
                'recipient': recipient,
                'amount': amount,
                'timestamp': timestamp,
                'is_fraud': 0
            })
        
        # Generate fraudulent transactions (20%)
        for _ in range(int(n_samples * 0.2)):
            # Various fraud patterns
            fraud_type = np.random.choice(['large_amount', 'suspicious_address', 'timing', 'pattern'])
            
            if fraud_type == 'large_amount':
                amount = np.random.choice([10000, 50000, 100000])
                sender = self._generate_address(suspicious=False)
                recipient = self._generate_address(suspicious=False)
                timestamp = time.time() - np.random.uniform(0, 86400)
            
            elif fraud_type == 'suspicious_address':
                amount = np.random.lognormal(mean=4, sigma=1)
                sender = self._generate_address(suspicious=True)
                recipient = self._generate_address(suspicious=True)
                timestamp = time.time() - np.random.uniform(0, 86400 * 7)
            
            elif fraud_type == 'timing':
                amount = np.random.lognormal(mean=3, sigma=1)
                sender = self._generate_address(suspicious=False)
                recipient = self._generate_address(suspicious=False)
                # Suspicious timing
                if np.random.random() < 0.5:
                    timestamp = time.time() + np.random.uniform(600, 3600)  # Future
                else:
                    timestamp = time.time() - np.random.uniform(3, 6) * 3600  # Late night
            
            else:  # pattern
                amount = np.random.choice([1000, 5000, 10000])  # Round amounts
                sender = self._generate_address(suspicious=False)
                recipient = sender if np.random.random() < 0.3 else self._generate_address(suspicious=False)
                timestamp = time.time() - np.random.uniform(0, 86400)
            
            data.append({
                'sender': sender,
                'recipient': recipient,
                'amount': amount,
                'timestamp': timestamp,
                'is_fraud': 1
            })
        
        return data
    
    def _generate_address(self, suspicious=False):
        """Generate synthetic blockchain address"""
        if suspicious:
            # Generate addresses with suspicious patterns
            if np.random.random() < 0.3:
                # Repeated characters
                char = np.random.choice(list('0123456789abcdef'))
                base = ''.join(np.random.choice(list('0123456789abcdef'), 30))
                return '0x' + base[:10] + char * 5 + base[15:]
            else:
                # Short or malformed
                return '0x' + ''.join(np.random.choice(list('0123456789abcdef'), 
                                                     np.random.randint(10, 25)))
        else:
            # Normal address
            return '0x' + ''.join(np.random.choice(list('0123456789abcdef'), 40))
    
    def train_model(self, training_data=None):
        """Train the fraud detection models"""
        try:
            if training_data is None:
                training_data = self.generate_synthetic_data()
            
            # Convert to DataFrame
            df = pd.DataFrame(training_data)
            
            # Extract features
            X = []
            y = df['is_fraud'].values
            
            for _, row in df.iterrows():
                features = self.extract_features(
                    row['sender'], row['recipient'], 
                    row['amount'], row['timestamp']
                ).flatten()
                X.append(features)
            
            X = np.array(X)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train anomaly detection model
            X_normal = X_train_scaled[y_train == 0]  # Only normal transactions
            self.anomaly_model.fit(X_normal)
            
            # Train classification model
            self.classification_model.fit(X_train_scaled, y_train)
            
            # Evaluate
            y_pred_class = self.classification_model.predict(X_test_scaled)
            y_pred_proba = self.classification_model.predict_proba(X_test_scaled)[:, 1]
            
            classification_score = self.classification_model.score(X_test_scaled, y_test)
            auc_score = roc_auc_score(y_test, y_pred_proba)
            
            # Anomaly detection evaluation
            anomaly_pred = self.anomaly_model.predict(X_test_scaled)
            anomaly_scores = self.anomaly_model.decision_function(X_test_scaled)
            
            self.trained = True
            
            # Save models
            self.save_model()
            
            logger.info(f"Fraud detector trained - Classification Score: {classification_score:.3f}, AUC: {auc_score:.3f}")
            
            return {
                'status': 'success',
                'classification_score': classification_score,
                'auc_score': auc_score,
                'samples_trained': len(training_data),
                'fraud_ratio': sum(y) / len(y)
            }
            
        except Exception as e:
            logger.error(f"Training failed: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def analyze_transaction(self, sender, recipient, amount, timestamp):
        """Analyze transaction for fraud"""
        try:
            if not self.trained:
                # Train with synthetic data if not trained
                self.train_model()
            
            # Extract features
            features = self.extract_features(sender, recipient, amount, timestamp)
            features_scaled = self.scaler.transform(features)
            
            # Anomaly detection
            anomaly_score = self.anomaly_model.decision_function(features_scaled)[0]
            is_anomaly = self.anomaly_model.predict(features_scaled)[0] == -1
            
            # Classification
            fraud_probability = self.classification_model.predict_proba(features_scaled)[0][1]
            is_fraud_class = self.classification_model.predict(features_scaled)[0]
            
            # Combine scores
            combined_risk = (fraud_probability * 0.7) + ((1 - (anomaly_score + 1) / 2) * 0.3)
            combined_risk = max(0, min(1, combined_risk))
            
            # Risk factors
            risk_factors = []
            if float(amount) > 10000:
                risk_factors.append('high_amount')
            if is_anomaly:
                risk_factors.append('anomalous_pattern')
            if fraud_probability > 0.7:
                risk_factors.append('suspicious_behavior')
            if str(sender) == str(recipient):
                risk_factors.append('self_transaction')
            
            return {
                'risk_score': float(combined_risk),
                'fraud_probability': float(fraud_probability),
                'anomaly_score': float(anomaly_score),
                'is_suspicious': combined_risk > 0.6,
                'is_high_risk': combined_risk > 0.8,
                'risk_factors': risk_factors,
                'confidence': 0.9,
                'model': 'ml_ensemble',
                'status': 'success',
                'analysis': {
                    'amount': float(amount),
                    'sender_length': len(str(sender)),
                    'recipient_length': len(str(recipient)),
                    'timestamp': timestamp
                }
            }
            
        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}")
            return {
                'error': str(e),
                'risk_score': 0.5,
                'is_suspicious': False,
                'status': 'error'
            }
    
    def save_model(self):
        """Save trained models and scaler"""
        try:
            joblib.dump(self.anomaly_model, self.anomaly_model_path)
            joblib.dump(self.classification_model, self.classification_model_path)
            joblib.dump(self.scaler, self.scaler_path)
            logger.info("Fraud detector models saved")
        except Exception as e:
            logger.error(f"Failed to save models: {str(e)}")
    
    def load_model(self):
        """Load saved models and scaler"""
        try:
            if (os.path.exists(self.anomaly_model_path) and 
                os.path.exists(self.classification_model_path) and 
                os.path.exists(self.scaler_path)):
                
                self.anomaly_model = joblib.load(self.anomaly_model_path)
                self.classification_model = joblib.load(self.classification_model_path)
                self.scaler = joblib.load(self.scaler_path)
                self.trained = True
                logger.info("Fraud detector models loaded")
                return True
        except Exception as e:
            logger.error(f"Failed to load models: {str(e)}")
        return False
    
    def is_trained(self):
        """Check if models are trained"""
        return self.trained
