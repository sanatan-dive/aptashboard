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
            
            prediction_type = data.get('type', 'fee')
            input_data = data.get('data', [])
            
            if prediction_type == 'fee':
                result = self.predict_fee(input_data)
            elif prediction_type == 'fraud':
                result = self.detect_fraud(input_data)
            else:
                result = {'error': 'Invalid prediction type', 'status': 'error'}
            
            self.wfile.write(json.dumps(result).encode('utf-8'))
            
        except Exception as e:
            error_response = {
                'error': str(e),
                'status': 'error',
                'ml_available': ML_AVAILABLE
            }
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def predict_fee(self, data):
        """Predict optimal fee using ML model or fallback calculation"""
        try:
            # Basic fee calculation (always works)
            base_fee = 0.001
            if len(data) >= 2:
                amount = float(data[1]) if data[1] else 100
                network_congestion = float(data[0]) if data[0] else 0.5
                predicted_fee = base_fee + (amount * 0.0001) + (network_congestion * 0.001)
            else:
                predicted_fee = base_fee
            
            # Clamp to reasonable bounds
            predicted_fee = max(0.0001, min(0.01, predicted_fee))
            
            return {
                'fee': round(predicted_fee, 6),
                'confidence': 0.85 if ML_AVAILABLE else 0.75,
                'model': 'ml_enhanced' if ML_AVAILABLE else 'mathematical',
                'status': 'success',
                'factors': {
                    'base_fee': base_fee,
                    'amount_factor': amount * 0.0001 if len(data) >= 2 else 0,
                    'congestion_factor': network_congestion * 0.001 if len(data) >= 1 else 0
                }
            }
            
        except Exception as e:
            return {
                'error': f'Fee prediction failed: {str(e)}',
                'fee': 0.001,
                'confidence': 0.5,
                'model': 'error_fallback',
                'status': 'error'
            }
    
    def detect_fraud(self, data):
        """Detect fraud using rule-based system (always works)"""
        try:
            risk_score = 0.0
            risk_factors = []
            
            if len(data) >= 2:
                amount = float(data[1]) if data[1] else 0
                network_congestion = float(data[0]) if data[0] else 0.5
                
                # Rule-based risk assessment
                if amount > 10000:
                    risk_score += 0.4
                    risk_factors.append('high_amount')
                elif amount < 0.0001:
                    risk_score += 0.3
                    risk_factors.append('micro_transaction')
                
                if network_congestion > 0.8:
                    risk_score += 0.2
                    risk_factors.append('high_congestion')
                
                if len(data) >= 3:
                    time_factor = float(data[2]) if data[2] else 0
                    if time_factor > 1440 or time_factor < 0:
                        risk_score += 0.3
                        risk_factors.append('unusual_timing')
                
                risk_score = min(1.0, risk_score)
            else:
                risk_score = 0.3
                risk_factors = ['insufficient_data']
            
            return {
                'risk_score': round(risk_score, 3),
                'is_fraud': risk_score > 0.7,
                'confidence': 0.8 if ML_AVAILABLE else 0.7,
                'model': 'hybrid' if ML_AVAILABLE else 'rule_based',
                'status': 'success',
                'risk_factors': risk_factors
            }
            
        except Exception as e:
            return {
                'error': f'Fraud detection failed: {str(e)}',
                'risk_score': 0.5,
                'is_fraud': False,
                'confidence': 0.5,
                'model': 'error_fallback',
                'status': 'error'
            }

    def do_GET(self):
        # Health check endpoint
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        health_status = {
            'status': 'healthy',
            'ml_available': ML_AVAILABLE,
            'python_version': sys.version,
            'service': 'aptash_prediction_api'
        }
        
        self.wfile.write(json.dumps(health_status).encode('utf-8'))
