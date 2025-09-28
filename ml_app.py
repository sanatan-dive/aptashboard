from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import logging

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import ML modules
from ml_services.fee_predictor import FeePredictor
from ml_services.fraud_detector import FraudDetector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize ML models
fee_predictor = FeePredictor()
fraud_detector = FraudDetector()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'aptash_ml_api',
        'models_loaded': {
            'fee_predictor': fee_predictor.is_trained(),
            'fraud_detector': fraud_detector.is_trained()
        }
    })

@app.route('/predict/fee', methods=['POST'])
def predict_fee():
    """Fee prediction endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract required fields
        amount = data.get('amount', 0)
        token_type = data.get('token_type', 'APT')
        network_load = data.get('network_load', 0.5)
        priority = data.get('priority', 'normal')
        
        # Predict fee
        result = fee_predictor.predict_fee(
            amount=amount,
            token_type=token_type,
            network_load=network_load,
            priority=priority
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Fee prediction error: {str(e)}")
        return jsonify({
            'error': f'Fee prediction failed: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/predict/fraud', methods=['POST'])
def predict_fraud():
    """Fraud detection endpoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract transaction data
        sender = data.get('sender', '')
        recipient = data.get('recipient', '')
        amount = data.get('amount', 0)
        timestamp = data.get('timestamp', 0)
        
        # Detect fraud
        result = fraud_detector.analyze_transaction(
            sender=sender,
            recipient=recipient,
            amount=amount,
            timestamp=timestamp
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Fraud detection error: {str(e)}")
        return jsonify({
            'error': f'Fraud detection failed: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/train/fee_predictor', methods=['POST'])
def train_fee_predictor():
    """Train fee prediction model with new data"""
    try:
        data = request.get_json()
        training_data = data.get('training_data', [])
        
        if not training_data:
            return jsonify({'error': 'No training data provided'}), 400
        
        result = fee_predictor.train_model(training_data)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Fee predictor training error: {str(e)}")
        return jsonify({
            'error': f'Training failed: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/train/fraud_detector', methods=['POST'])
def train_fraud_detector():
    """Train fraud detection model with new data"""
    try:
        data = request.get_json()
        training_data = data.get('training_data', [])
        
        if not training_data:
            return jsonify({'error': 'No training data provided'}), 400
        
        result = fraud_detector.train_model(training_data)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Fraud detector training error: {str(e)}")
        return jsonify({
            'error': f'Training failed: {str(e)}',
            'status': 'error'
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Load pre-trained models if available
    fee_predictor.load_model()
    fraud_detector.load_model()
    
    # Run the app
    app.run(host='0.0.0.0', port=8000, debug=False)
