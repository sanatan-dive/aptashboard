import numpy as np
import torch
import torch.nn as nn
from sklearn.ensemble import IsolationForest
import json
import argparse
import joblib
import os
import sys
import logging
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Model paths
MODELS_DIR = os.path.dirname(os.path.abspath(__file__))
FEE_MODEL_PATH = os.path.join(MODELS_DIR, '..', '..', 'fee_predictor.pth')
FRAUD_MODEL_PATH = os.path.join(MODELS_DIR, '..', '..', 'fraud_detector.pkl')

class FeePredictor(nn.Module):
    def __init__(self, input_size=3, hidden_size=64, num_layers=2):
        super(FeePredictor, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, 1)
        self.dropout = nn.Dropout(0.2)
    
    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.dropout(out[:, -1, :])
        out = self.fc(out)
        return torch.sigmoid(out)  # Ensure positive output

def validate_input_data(data: List[float]) -> bool:
    """Validate input data format and ranges."""
    if len(data) != 3:
        return False
    
    # Check for reasonable ranges
    gas_fee, tx_volume, timestamp = data
    
    if not (0.001 <= gas_fee <= 10.0):  # Gas fee between 0.001 and 10.0
        return False
    if not (1 <= tx_volume <= 1000000):  # Transaction volume
        return False
    if not (0 <= timestamp <= 24 * 60):  # Timestamp in minutes
        return False
    
    return True

def generate_synthetic_fee_data(n_samples=1000) -> np.ndarray:
    """Generate synthetic data for training."""
    logger.info(f"Generating {n_samples} synthetic samples")
    data = []
    
    for _ in range(n_samples):
        # More realistic data generation
        base_fee = np.random.lognormal(mean=-3, sigma=1)  # Log-normal distribution
        gas_fee = np.clip(base_fee, 0.001, 1.0)
        
        tx_volume = np.random.exponential(scale=200)
        tx_volume = np.clip(tx_volume, 100, 10000)
        
        timestamp = np.random.randint(0, 24 * 60)
        
        data.append([gas_fee, tx_volume, timestamp])
    
    return np.array(data)

def train_fee_predictor() -> None:
    """Train the fee prediction model."""
    if os.path.exists(FEE_MODEL_PATH):
        logger.info("Fee predictor model already exists, skipping training")
        return
    
    logger.info("Training fee predictor model")
    model = FeePredictor()
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-5)
    
    # Generate training data
    data = generate_synthetic_fee_data(5000)
    X = torch.tensor(data, dtype=torch.float32).reshape(-1, 1, 3)
    
    # Create target fees based on input features (more realistic)
    base_fees = data[:, 0]
    volume_multiplier = 1 + (data[:, 1] - 100) / 10000  # Volume impact
    time_multiplier = 1 + 0.1 * np.sin(2 * np.pi * data[:, 2] / (24 * 60))  # Time of day impact
    y = torch.tensor(base_fees * volume_multiplier * time_multiplier, dtype=torch.float32).reshape(-1, 1)
    
    # Training loop
    model.train()
    for epoch in range(200):
        optimizer.zero_grad()
        outputs = model(X)
        loss = criterion(outputs, y)
        loss.backward()
        optimizer.step()
        
        if epoch % 50 == 0:
            logger.info(f"Epoch {epoch}, Loss: {loss.item():.6f}")
    
    # Save model
    torch.save(model.state_dict(), FEE_MODEL_PATH)
    logger.info(f"Fee predictor model saved to {FEE_MODEL_PATH}")

def train_fraud_detector() -> None:
    """Train the fraud detection model."""
    if os.path.exists(FRAUD_MODEL_PATH):
        logger.info("Fraud detector model already exists, skipping training")
        return
    
    logger.info("Training fraud detector model")
    
    # Generate training data with anomalies
    normal_data = generate_synthetic_fee_data(4000)
    
    # Create anomalous data
    anomalous_data = []
    for _ in range(500):
        # Unusual patterns for fraud detection
        gas_fee = np.random.choice([0.0001, 5.0])  # Extremely low or high fees
        tx_volume = np.random.choice([1, 100000])  # Extremely low or high volume
        timestamp = np.random.randint(0, 24 * 60)
        anomalous_data.append([gas_fee, tx_volume, timestamp])
    
    # Combine data
    all_data = np.vstack([normal_data, np.array(anomalous_data)])
    
    # Train isolation forest
    model = IsolationForest(
        contamination=0.1,
        random_state=42,
        n_estimators=200,
        max_samples='auto'
    )
    model.fit(all_data)
    
    # Save model
    joblib.dump(model, FRAUD_MODEL_PATH)
    logger.info(f"Fraud detector model saved to {FRAUD_MODEL_PATH}")

def predict_fee(data: List[float]) -> Dict[str, Any]:
    """Predict optimal fee for transaction."""
    try:
        if not validate_input_data(data):
            raise ValueError("Invalid input data ranges")
        
        train_fee_predictor()  # Ensure model exists
        
        model = FeePredictor()
        model.load_state_dict(torch.load(FEE_MODEL_PATH, map_location='cpu'))
        model.eval()
        
        with torch.no_grad():
            input_data = torch.tensor(data, dtype=torch.float32).reshape(1, 1, 3)
            prediction = model(input_data)
            optimal_fee = float(prediction.item())
            
            # Add confidence interval
            confidence = 0.95 if 0.001 <= optimal_fee <= 1.0 else 0.7
            
            return {
                'optimalFee': optimal_fee,
                'confidence': confidence,
                'recommendation': 'optimal' if confidence > 0.9 else 'caution'
            }
    
    except Exception as e:
        logger.error(f"Fee prediction error: {e}")
        return {'error': str(e)}

def detect_fraud(data: List[float]) -> Dict[str, Any]:
    """Detect fraudulent transaction patterns."""
    try:
        if not validate_input_data(data):
            raise ValueError("Invalid input data ranges")
        
        train_fraud_detector()  # Ensure model exists
        
        model = joblib.load(FRAUD_MODEL_PATH)
        prediction = model.predict([data])
        anomaly_score = model.decision_function([data])[0]
        
        is_suspicious = bool(prediction[0] == -1)
        confidence = abs(anomaly_score)
        
        # Risk assessment
        if confidence > 0.5:
            risk_level = 'high'
        elif confidence > 0.2:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        return {
            'isSuspicious': is_suspicious,
            'riskLevel': risk_level,
            'confidence': float(confidence),
            'anomalyScore': float(anomaly_score)
        }
    
    except Exception as e:
        logger.error(f"Fraud detection error: {e}")
        return {'error': str(e)}

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description='AI Models for Fee Prediction and Fraud Detection')
    parser.add_argument('--type', type=str, choices=['fee', 'fraud'], required=True,
                       help='Type of prediction to perform')
    parser.add_argument('--data', type=str, required=True,
                       help='JSON string containing input data')
    
    args = parser.parse_args()
    
    try:
        # Parse and validate input data
        data = json.loads(args.data)
        if not isinstance(data, list) or len(data) != 3:
            raise ValueError('Data must be a list of 3 numbers')
        
        # Convert to float and validate
        data = [float(x) for x in data]
        
        # Perform prediction
        if args.type == 'fee':
            result = predict_fee(data)
        elif args.type == 'fraud':
            result = detect_fraud(data)
        else:
            result = {'error': 'Invalid prediction type'}
        
        # Output result as JSON
        print(json.dumps(result))
    
    except (json.JSONDecodeError, ValueError, TypeError) as e:
        error_result = {'error': f'Invalid input: {str(e)}'}
        print(json.dumps(error_result))
        sys.exit(1)
    except Exception as e:
        error_result = {'error': f'Prediction failed: {str(e)}'}
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()