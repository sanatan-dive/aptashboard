import numpy as np
import torch
import torch.nn as nn
from sklearn.ensemble import IsolationForest
import json
import argparse
import joblib
import os

# Fee Prediction Model (LSTM)
class FeePredictor(nn.Module):
    def __init__(self, input_size=3, hidden_size=64, num_layers=2):
        super(FeePredictor, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, 1)
    
    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.fc(out[:, -1, :])
        return out

# Generate synthetic data
def generate_synthetic_fee_data(n_samples=1000):
    data = []
    for _ in range(n_samples):
        gas_fee = np.random.uniform(0.001, 0.1)
        tx_volume = np.random.randint(100, 1000)
        timestamp = np.random.randint(0, 24 * 60)
        data.append([gas_fee, tx_volume, timestamp])
    return np.array(data)

# Train models
def train_fee_predictor():
    if os.path.exists('fee_predictor.pth'):
        return  # Skip training if model exists
    model = FeePredictor()
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    data = generate_synthetic_fee_data()
    X = torch.tensor(data, dtype=torch.float32).reshape(-1, 1, 3)
    y = torch.tensor(data[:, 0], dtype=torch.float32).reshape(-1, 1)
    
    for epoch in range(100):
        optimizer.zero_grad()
        outputs = model(X)
        loss = criterion(outputs, y)
        loss.backward()
        optimizer.step()
    
    torch.save(model.state_dict(), 'fee_predictor.pth')

def train_fraud_detector():
    if os.path.exists('fraud_detector.pkl'):
        return  # Skip training if model exists
    data = generate_synthetic_fee_data()
    model = IsolationForest(contamination=0.1, random_state=42)
    model.fit(data)
    joblib.dump(model, 'fraud_detector.pkl')

# Prediction functions
def predict_fee(data):
    train_fee_predictor()  # Ensure model is trained or loaded
    model = FeePredictor()
    model.load_state_dict(torch.load('fee_predictor.pth'))
    model.eval()
    with torch.no_grad():
        input_data = torch.tensor(data, dtype=torch.float32).reshape(1, 1, 3)
        prediction = model(input_data)
    return prediction.item()

def detect_fraud(data):
    train_fraud_detector()  # Ensure model is trained or loaded
    model = joblib.load('fraud_detector.pkl')
    prediction = model.predict([data])
    return bool(prediction[0] == -1)

# Command-line interface
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--type', type=str, choices=['fee', 'fraud'], required=True)
    parser.add_argument('--data', type=str, required=True)
    args = parser.parse_args()
    
    # Parse JSON string to numerical array
    try:
        data = json.loads(args.data)
        if not isinstance(data, list) or len(data) != 3:
            raise ValueError('Data must be a list of 3 numbers')
        data = [float(x) for x in data]  # Ensure numerical values
    except (json.JSONDecodeError, ValueError) as e:
        print(json.dumps({'error': f'Invalid data format: {str(e)}'}))
        exit(1)
    
    if args.type == 'fee':
        result = predict_fee(data)
        print(json.dumps({'optimalFee': result}))
    elif args.type == 'fraud':
        result = detect_fraud(data)
        print(json.dumps({'isSuspicious': bool(result)}))