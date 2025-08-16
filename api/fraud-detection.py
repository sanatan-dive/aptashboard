import json
import sys
from http.server import BaseHTTPRequestHandler

try:
    import numpy as np
    from sklearn.ensemble import IsolationForest
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        try:
            # Get request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Extract transaction data
            sender = data.get('sender', '')
            recipient = data.get('recipient', '')
            amount = data.get('amount', 0)
            timestamp = data.get('timestamp', 0)
            
            result = self.analyze_transaction(sender, recipient, amount, timestamp)
            self.wfile.write(json.dumps(result).encode('utf-8'))
            
        except Exception as e:
            error_response = {
                'error': str(e),
                'status': 'error',
                'risk_score': 0.5,
                'is_suspicious': False
            }
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def analyze_transaction(self, sender, recipient, amount, timestamp):
        """Analyze transaction for fraud indicators"""
        try:
            risk_score = 0.0
            risk_factors = []
            
            # Convert amount to float
            try:
                amount = float(amount)
            except (ValueError, TypeError):
                amount = 0.0
            
            # Amount-based risk assessment
            if amount > 100000:  # Very high amount
                risk_score += 0.4
                risk_factors.append('very_high_amount')
            elif amount > 10000:  # High amount
                risk_score += 0.2
                risk_factors.append('high_amount')
            elif amount < 0.001:  # Micro transaction
                risk_score += 0.15
                risk_factors.append('micro_transaction')
            
            # Address-based risk assessment
            if sender == recipient:
                risk_score += 0.3
                risk_factors.append('self_transaction')
            
            if len(sender) < 10 or len(recipient) < 10:
                risk_score += 0.2
                risk_factors.append('invalid_address_format')
            
            # Pattern-based detection
            if self._check_suspicious_patterns(sender, recipient, amount):
                risk_score += 0.3
                risk_factors.append('suspicious_pattern')
            
            # Time-based analysis
            if timestamp:
                time_risk = self._analyze_timing(timestamp)
                risk_score += time_risk
                if time_risk > 0.1:
                    risk_factors.append('unusual_timing')
            
            # ML-based analysis if available
            if ML_AVAILABLE:
                ml_risk = self._ml_fraud_detection(amount, len(sender), len(recipient))
                risk_score += ml_risk * 0.3  # Weight ML component
                if ml_risk > 0.7:
                    risk_factors.append('ml_anomaly_detected')
            
            # Clamp risk score
            risk_score = min(1.0, max(0.0, risk_score))
            
            return {
                'risk_score': round(risk_score, 3),
                'is_suspicious': risk_score > 0.6,
                'is_high_risk': risk_score > 0.8,
                'risk_factors': risk_factors,
                'confidence': 0.85 if ML_AVAILABLE else 0.7,
                'model': 'hybrid_detection' if ML_AVAILABLE else 'rule_based',
                'status': 'success',
                'analysis': {
                    'amount': amount,
                    'sender_length': len(sender),
                    'recipient_length': len(recipient),
                    'timestamp': timestamp
                }
            }
            
        except Exception as e:
            return {
                'error': f'Fraud analysis failed: {str(e)}',
                'risk_score': 0.5,
                'is_suspicious': False,
                'status': 'error'
            }
    
    def _check_suspicious_patterns(self, sender, recipient, amount):
        """Check for known suspicious patterns"""
        try:
            # Check for round numbers (often used in fraud)
            if amount in [1000, 5000, 10000, 50000, 100000]:
                return True
            
            # Check for repeated characters in addresses
            if len(set(sender)) < len(sender) / 3 or len(set(recipient)) < len(recipient) / 3:
                return True
            
            # Check for very similar addresses (potential typosquatting)
            if len(sender) == len(recipient):
                diff_count = sum(1 for a, b in zip(sender, recipient) if a != b)
                if diff_count <= 2:  # Very similar addresses
                    return True
            
            return False
        except:
            return False
    
    def _analyze_timing(self, timestamp):
        """Analyze transaction timing for risk"""
        try:
            import time
            current_time = time.time()
            
            # If timestamp is in the future
            if timestamp > current_time + 300:  # 5 minutes tolerance
                return 0.3
            
            # If timestamp is very old
            if current_time - timestamp > 86400 * 30:  # 30 days old
                return 0.2
            
            # Check for unusual hours (assuming UTC)
            hour = int((timestamp % 86400) / 3600)
            if hour < 5 or hour > 23:  # Very late/early hours
                return 0.1
            
            return 0.0
        except:
            return 0.0
    
    def _ml_fraud_detection(self, amount, sender_len, recipient_len):
        """ML-based fraud detection"""
        try:
            if not ML_AVAILABLE:
                return 0.0
            
            # Create feature vector
            features = np.array([
                amount / 10000.0,  # Normalized amount
                sender_len / 100.0,  # Normalized sender length
                recipient_len / 100.0,  # Normalized recipient length
            ]).reshape(1, -1)
            
            # Simple anomaly detection
            # In a real implementation, you'd load a pre-trained model
            np.random.seed(42)
            normal_data = np.random.normal(0, 1, (100, 3))
            
            iso_forest = IsolationForest(contamination=0.1, random_state=42)
            iso_forest.fit(normal_data)
            
            anomaly_score = iso_forest.decision_function(features)[0]
            
            # Convert to risk score (0-1)
            risk_score = max(0, min(1, (1 - anomaly_score) / 2))
            
            return risk_score
            
        except Exception:
            return 0.0
    
    def do_GET(self):
        # Health check endpoint
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        health_status = {
            'status': 'healthy',
            'service': 'aptash_fraud_detection',
            'ml_available': ML_AVAILABLE,
            'python_version': sys.version
        }
        
        self.wfile.write(json.dumps(health_status).encode('utf-8'))
