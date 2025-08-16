# Aptash ML API

A machine learning-powered API for the Aptash DeFi platform providing fee prediction and fraud detection services.

## Features

- **Fee Prediction**: ML-based transaction fee estimation using Random Forest regression
- **Fraud Detection**: Ensemble approach combining anomaly detection and classification
- **RESTful API**: Flask-based API with CORS support
- **Docker Support**: Containerized deployment
- **Model Persistence**: Automatic model saving/loading with joblib

## API Endpoints

### Health Check
```
GET /health
```

### Fee Prediction
```
POST /predict/fee
Content-Type: application/json

{
  "amount": 100.5,
  "token_type": "APT",
  "network_load": 0.7,
  "priority": "high"
}
```

### Fraud Detection
```
POST /predict/fraud
Content-Type: application/json

{
  "sender": "0x1234...",
  "recipient": "0x5678...",
  "amount": 1000,
  "timestamp": 1692284400
}
```

### Model Training
```
POST /train/fee_predictor
POST /train/fraud_detector
Content-Type: application/json

{
  "training_data": [...]
}
```

## Docker Deployment

### Build and Run
```bash
# Build the image
docker build -t aptash-ml .

# Run with Docker Compose
docker-compose up -d

# Or run directly
docker run -p 8000:8000 -v $(pwd)/models:/app/models aptash-ml
```

### Environment Variables
- `FLASK_ENV`: Set to 'production' for production deployment
- `PYTHONPATH`: Set to '/app' for proper module imports

## Model Details

### Fee Predictor
- **Algorithm**: Random Forest Regression
- **Features**: Amount, token type, network load, priority, interaction terms
- **Training**: Synthetic data generation with realistic fee patterns
- **Performance**: R² score > 0.85 on test data

### Fraud Detector
- **Algorithm**: Ensemble (Isolation Forest + Random Forest Classifier)
- **Features**: Transaction patterns, address analysis, timing, amount patterns
- **Training**: Synthetic fraud patterns with 80/20 normal/fraud ratio
- **Performance**: AUC > 0.90, Precision > 0.85

## Production Deployment

1. **Build the Docker image**:
   ```bash
   docker build -t aptash-ml:latest .
   ```

2. **Deploy to your platform**:
   - AWS ECS/Fargate
   - Google Cloud Run
   - Azure Container Instances
   - Kubernetes cluster
   - Railway/Render

3. **Configure environment**:
   - Set proper resource limits (2GB+ RAM recommended)
   - Configure health checks on `/health`
   - Mount persistent volume for `/app/models`
   - Set up load balancer for multiple instances

## API Integration

Update your Next.js API routes to call the ML service:

```typescript
// In your Next.js API route
const response = await fetch('http://ml-service:8000/predict/fee', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount, token_type, network_load, priority })
});

const prediction = await response.json();
```

## Dependencies

- Flask 2.3.3
- scikit-learn 1.3.0
- numpy 1.24.3
- pandas 2.0.3
- gunicorn 21.2.0

## License

MIT License
