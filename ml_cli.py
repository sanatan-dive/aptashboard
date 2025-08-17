#!/usr/bin/env python3
"""
ML CLI interface for Aptash project
Provides command-line access to ML fraud detection and fee prediction services
"""

import sys
import json
import os
import time

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def predict_fraud_ml(data):
    """Predict fraud using ML models with fallback"""
    with open('/tmp/ml_debug.log', 'a') as f:
        f.write(f"predict_fraud_ml called with data: {data}\n")
    try:
        from ml_services.fraud_detector import FraudDetector
        
        # Handle different data formats
        if len(data) == 3:
            # Generic prediction format: [network_load, amount, priority]
            network_load, amount, priority = data[0], data[1], data[2]
            # Create mock addresses for ML model
            sender = "0x1234567890abcdef" + "0" * 48  # 64 char address
            recipient = "0xfedcba0987654321" + "0" * 48  # 64 char address
            timestamp = int(time.time())
        elif len(data) >= 4:
            # Full transaction format: [sender, recipient, amount, timestamp]
            sender, recipient, amount, timestamp = data[0], data[1], data[2], data[3]
        else:
            return {
                'error': 'Insufficient data for fraud prediction',
                'status': 'error'
            }
        
        # Try ML-based prediction
        with open('/tmp/ml_debug.log', 'a') as f:
            f.write(f"Attempting ML prediction with sender={sender}, recipient={recipient}, amount={amount}\n")
        try:
            from ml_services.fraud_detector import FraudDetector
            with open('/tmp/ml_debug.log', 'a') as f:
                f.write("Imported FraudDetector\n")
            
            fraud_detector = FraudDetector()
            with open('/tmp/ml_debug.log', 'a') as f:
                f.write(f"FraudDetector created, trained: {fraud_detector.trained}\n")
            
            # Try to predict with ML model if available
            if fraud_detector.trained or fraud_detector.load_model():
                with open('/tmp/ml_debug.log', 'a') as f:
                    f.write("Loading/using ML model...\n")
                result = fraud_detector.analyze_transaction(
                    str(sender),
                    str(recipient), 
                    float(amount),
                    int(timestamp) if timestamp else int(time.time())
                )
                with open('/tmp/ml_debug.log', 'a') as f:
                    f.write(f"ML result: {result}\n")
                
                return {
                    'prediction': result.get('risk_score', 0.1),
                    'risk_score': result.get('risk_score', 0.1),
                    'is_suspicious': result.get('is_suspicious', False),
                    'is_high_risk': result.get('is_high_risk', False),
                    'confidence': result.get('confidence', 0.9),
                    'model': 'isolation_forest_ensemble',
                    'risk_factors': result.get('risk_factors', []),
                    'status': 'success'
                }
            else:
                with open('/tmp/ml_debug.log', 'a') as f:
                    f.write("ML model not available\n")
        except Exception as ml_error:
            # Log the error for debugging but continue to fallback
            with open('/tmp/ml_debug.log', 'a') as f:
                f.write(f"ML prediction failed: {ml_error}\n")
            pass
        
        # Fallback to rule-based detection
        risk_score = 0.1
        risk_factors = []
        
        # High amount transactions are riskier
        if float(amount) > 10000:
            risk_score += 0.3
            risk_factors.append("high_amount")
        elif float(amount) > 1000:
            risk_score += 0.1
            risk_factors.append("medium_amount")
        
        # Suspicious address patterns
        if str(sender).lower() == str(recipient).lower():
            risk_score += 0.4
            risk_factors.append("self_transfer")
        
        # Address analysis
        if len(str(sender)) < 10 or len(str(recipient)) < 10:
            risk_score += 0.2
            risk_factors.append("malformed_address")
        
        risk_score = min(risk_score, 1.0)
        
        return {
            'prediction': risk_score,
            'risk_score': risk_score,
            'is_suspicious': risk_score > 0.5,
            'is_high_risk': risk_score > 0.7,
            'confidence': 0.75,
            'model': 'rule_based_enhanced',
            'risk_factors': risk_factors,
            'status': 'success'
        }
        
    except Exception as e:
        return {
            'error': f'Fraud prediction failed: {str(e)}',
            'prediction': 0.1,
            'risk_score': 0.1,
            'model': 'error_fallback',
            'status': 'error'
        }

def predict_fee_ml(data):
    """Predict transaction fee using ML models with fallback"""
    try:
        from ml_services.fee_predictor import FeePredictor
        
        if len(data) < 3:
            return {
                'error': 'Insufficient data for fee prediction',
                'status': 'error'
            }
        
        amount, network_load, priority = data[0], data[1], data[2]
        
        # Try ML-based prediction
        try:
            fee_predictor = FeePredictor()
            
            # Try to predict with ML model if available
            if fee_predictor.trained or fee_predictor.load_model():
                result = fee_predictor.predict_fee(
                    amount=float(amount),
                    token_type='APT',
                    network_load=float(network_load) if network_load else 0.5,
                    priority=str(priority) if priority else 'normal'
                )
                
                return {
                    'prediction': result.get('predicted_fee', 0.001),
                    'fee': result.get('predicted_fee', 0.001),
                    'predicted_fee': result.get('predicted_fee', 0.001),
                    'currency': result.get('currency', 'APT'),
                    'confidence': result.get('confidence', 0.8),
                    'model': 'random_forest_regressor',
                    'factors': result.get('factors', {}),
                    'status': 'success'
                }
        except Exception:
            pass
        
        # Fallback to mathematical model
        base_fee = 0.001
        amount_float = float(amount)
        network_load_float = float(network_load) if network_load else 0.5
        
        # Amount-based fee calculation
        amount_factor = min(amount_float * 0.0001, 0.01)
        
        # Network load factor
        network_factor = network_load_float * 0.005
        
        # Priority multiplier
        priority_multiplier = {
            'low': 0.8,
            'normal': 1.0,
            'high': 1.5,
            'urgent': 2.0
        }.get(str(priority).lower(), 1.0)
        
        predicted_fee = (base_fee + amount_factor + network_factor) * priority_multiplier
        predicted_fee = max(0.0001, predicted_fee)  # Minimum fee
        
        return {
            'prediction': predicted_fee,
            'fee': predicted_fee,
            'predicted_fee': predicted_fee,
            'currency': 'APT',
            'confidence': 0.85,
            'model': 'mathematical_enhanced',
            'factors': {
                'amount': amount_float,
                'network_load': network_load_float,
                'priority': str(priority),
                'base_fee': base_fee,
                'amount_factor': amount_factor,
                'network_factor': network_factor
            },
            'status': 'success'
        }
        
    except Exception as e:
        return {
            'error': f'Fee prediction failed: {str(e)}',
            'prediction': 0.001,
            'fee': 0.001,
            'predicted_fee': 0.001,
            'model': 'error_fallback',
            'status': 'error'
        }

def main():
    try:
        # Read input
        input_data = sys.stdin.read().strip()
        lines = input_data.split('\n')
        prediction_type = lines[0].strip()
        data = json.loads(lines[1].strip())
        
        with open('/tmp/ml_debug.log', 'a') as f:
            f.write(f"Main called with type={prediction_type}, data={data}\n")
        
        # Route to appropriate prediction function
        if prediction_type == 'fraud':
            result = predict_fraud_ml(data)
        elif prediction_type == 'fee':
            result = predict_fee_ml(data)
        else:
            result = {'error': f'Unknown prediction type: {prediction_type}', 'status': 'error'}
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {'error': f'CLI error: {str(e)}', 'status': 'error'}
        print(json.dumps(error_result))

if __name__ == '__main__':
    main()
