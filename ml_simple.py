#!/usr/bin/env python3
import sys
import json

def main():
    try:
        # Read input
        input_data = sys.stdin.read().strip()
        lines = input_data.split('\n')
        prediction_type = lines[0].strip()
        data = json.loads(lines[1].strip())
        
        if prediction_type == 'fraud':
            # Try ML model first, fallback to enhanced rules
            try:
                sys.path.append('.')
                from ml_services.fraud_detector import FraudDetector
                fd = FraudDetector()
                if fd.load_model():
                    result = fd.analyze_transaction(str(data[0]), str(data[1]), float(data[2]), int(data[3]))
                    print(json.dumps({
                        'prediction': result.get('risk_score', 0.1),
                        'risk_score': result.get('risk_score', 0.1),
                        'is_suspicious': bool(result.get('is_suspicious', False)),
                        'is_high_risk': bool(result.get('is_high_risk', False)),
                        'confidence': result.get('confidence', 0.9),
                        'model': 'isolation_forest_ensemble',
                        'risk_factors': result.get('risk_factors', []),
                        'status': 'success'
                    }))
                    return
            except:
                pass
            
            # Enhanced rule-based fallback
            amount = float(data[2])
            risk_score = 0.1
            risk_factors = []
            
            if amount > 10000:
                risk_score += 0.3
                risk_factors.append("high_amount")
            elif amount > 1000:
                risk_score += 0.1
                risk_factors.append("medium_amount")
                
            if str(data[0]).lower() == str(data[1]).lower():
                risk_score += 0.4
                risk_factors.append("self_transfer")
                
            if len(str(data[0])) < 10 or len(str(data[1])) < 10:
                risk_score += 0.2
                risk_factors.append("malformed_address")
            
            print(json.dumps({
                'prediction': min(risk_score, 1.0),
                'risk_score': min(risk_score, 1.0),
                'is_suspicious': risk_score > 0.5,
                'is_high_risk': risk_score > 0.7,
                'confidence': 0.75,
                'model': 'rule_based_enhanced',
                'risk_factors': risk_factors,
                'status': 'success'
            }))
            
        elif prediction_type == 'fee':
            # Try ML model first, fallback to mathematical
            try:
                sys.path.append('.')
                from ml_services.fee_predictor import FeePredictor
                fp = FeePredictor()
                if fp.load_model():
                    result = fp.predict_fee(float(data[0]), 'APT', float(data[1]), str(data[2]))
                    print(json.dumps({
                        'prediction': result.get('predicted_fee', 0.001),
                        'fee': result.get('predicted_fee', 0.001),
                        'predicted_fee': result.get('predicted_fee', 0.001),
                        'currency': 'APT',
                        'confidence': result.get('confidence', 0.8),
                        'model': 'random_forest_regressor',
                        'factors': result.get('factors', {}),
                        'status': 'success'
                    }))
                    return
            except:
                pass
            
            # Mathematical fallback
            amount = float(data[0])
            network_load = float(data[1]) if data[1] else 0.5
            priority = str(data[2]) if data[2] else 'normal'
            
            base_fee = 0.001
            amount_factor = min(amount * 0.0001, 0.01)
            network_factor = network_load * 0.005
            priority_multiplier = {'low': 0.8, 'normal': 1.0, 'high': 1.5, 'urgent': 2.0}.get(priority.lower(), 1.0)
            
            predicted_fee = max(0.0001, (base_fee + amount_factor + network_factor) * priority_multiplier)
            
            print(json.dumps({
                'prediction': predicted_fee,
                'fee': predicted_fee,
                'predicted_fee': predicted_fee,
                'currency': 'APT',
                'confidence': 0.85,
                'model': 'mathematical_enhanced',
                'status': 'success'
            }))
        
    except Exception as e:
        print(json.dumps({'error': str(e), 'status': 'error'}))

if __name__ == '__main__':
    main()
