# Aptash API Documentation

## Overview
This document describes the production-ready API endpoints for the Aptash decentralized finance platform. All endpoints include robust validation, error handling, logging, metrics, and security features.

## Base URL
- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Authentication
Currently, the API uses wallet-based authentication through signed transactions. Future versions may include API key authentication for advanced features.

## Rate Limiting
- Default: 60 requests per minute per IP
- Configurable via `RATE_LIMIT_REQUESTS_PER_MINUTE` environment variable
- Rate limit headers are included in responses

## Global Headers
All API responses include:
- `X-Request-ID`: Unique identifier for request tracing
- `X-Rate-Limit-Remaining`: Remaining requests in current window
- `X-Response-Time`: Response time in milliseconds

---

## Health Check API

### GET /api/health
Check the overall health status of the application and its dependencies.

**Query Parameters:**
- `detailed` (optional): Set to "true" for detailed service information

**Response:**
```json
{
  "status": "healthy" | "unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "uptime": 123.45,
  "environment": "production",
  "services": {
    "aptos": {
      "status": "healthy" | "unhealthy",
      "latency": 150
    },
    "python": {
      "status": "healthy" | "unhealthy", 
      "latency": 50
    }
  },
  "metrics": {
    "totalRequests": 1000,
    "errorRate": 0.01,
    "avgResponseTime": 200
  }
}
```

**Status Codes:**
- `200`: Service is healthy
- `503`: Service is unhealthy

### HEAD /api/health
Lightweight health check for load balancers.

---

## Transfer API

### POST /api/transfer
Execute or prepare Aptos blockchain transfers with fraud detection and fee estimation.

**Request Body:**
```json
{
  "senderAddress": "0x123...",
  "recipientAddress": "0x456...",
  "amount": "1000000", // Amount in APT units
  "token": "APT", // Token symbol
  "signedTransaction": { ... }, // Optional: signed transaction for execution
  "metadata": { // Optional
    "memo": "Payment for services",
    "priority": "normal" | "high"
  }
}
```

**Response (Unsigned Transaction):**
```json
{
  "payload": {
    "type": "entry_function_payload",
    "function": "0x1::coin::transfer",
    "type_arguments": ["0x1::aptos_coin::AptosCoin"],
    "arguments": ["0x456...", "1000000"]
  },
  "message": "Sign this transaction to complete transfer",
  "requestId": "req_123...",
  "fraudDetection": {
    "riskScore": 0.15,
    "riskLevel": "low",
    "checks": ["amount", "frequency", "recipient"]
  },
  "estimatedFee": "0.001",
  "metadata": {
    "gasLimit": "2000",
    "gasPrice": "100"
  }
}
```

**Response (Executed Transaction):**
```json
{
  "success": true,
  "txId": "0x789...",
  "explorerUrl": "https://explorer.aptoslabs.com/txn/0x789...",
  "result": { ... }, // Full transaction result
  "fraudDetection": {
    "riskScore": 0.15,
    "riskLevel": "low"
  },
  "actualFee": "0.0009",
  "requestId": "req_123..."
}
```

### GET /api/transfer
Query transaction status and transfer history.

**Query Parameters:**
- `txId` (optional): Specific transaction ID to check
- `address` (optional): Address to get transfer history for
- `limit` (optional): Maximum number of results (default: 10, max: 100)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "transactions": [
    {
      "txId": "0x789...",
      "status": "success" | "pending" | "failed",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "from": "0x123...",
      "to": "0x456...",
      "amount": "1000000",
      "token": "APT",
      "fee": "0.0009"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## Prediction API

### POST /api/predict
Get AI-powered predictions for fee estimation and fraud detection.

**Request Body:**
```json
{
  "type": "fee" | "fraud",
  "data": [0.5, 1000, 720], // [gas_price, tx_volume, time_of_day_minutes]
  "options": { // Optional
    "includeConfidence": true,
    "modelVersion": "v2.1"
  }
}
```

**Response:**
```json
{
  "prediction": 0.85, // Fee estimate in APT or fraud probability
  "confidence": 0.92,
  "type": "fee",
  "inputData": [0.5, 1000, 720],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req_123...",
  "cached": false,
  "modelVersion": "v2.1",
  "metadata": {
    "processingTime": 150,
    "dataQuality": "high"
  }
}
```

### GET /api/predict
Simple prediction API for GET requests.

**Query Parameters:**
- `type`: "fee" or "fraud"
- `data`: JSON array as string, e.g. "[0.5, 1000, 720]"

**Response:** Same as POST response format.

---

## Lending API

### POST /api/lending
Create or accept peer-to-peer lending offers.

**Request Body:**
```json
{
  "lenderAddress": "0x123...",
  "amount": "5000000", // Amount in APT units
  "interestRate": "5.5", // Annual interest rate percentage
  "token": "APT",
  "duration": 30, // Loan duration in days
  "signedTransaction": { ... } // Optional: for executing the offer
}
```

**Response (Unsigned Offer):**
```json
{
  "payload": {
    "type": "entry_function_payload",
    "function": "0x1::P2PLending::offer_loan",
    "type_arguments": [],
    "arguments": [5000000, 550, "APT", 30]
  },
  "message": "Sign this transaction to create loan offer",
  "requestId": "req_123...",
  "metadata": {
    "estimatedFee": "0.001",
    "gasLimit": "2000"
  }
}
```

**Response (Executed Offer):**
```json
{
  "success": true,
  "txId": "0x789...",
  "loanId": "loan_789abc...",
  "result": { ... },
  "requestId": "req_123..."
}
```

### GET /api/lending
Query available lending offers and loan status.

**Query Parameters:**
- `loanId` (optional): Specific loan ID to query
- `lender` (optional): Filter by lender address
- `borrower` (optional): Filter by borrower address
- `status` (optional): Filter by loan status
- `limit` (optional): Maximum results (default: 10, max: 50)

**Response:**
```json
{
  "loans": [
    {
      "loanId": "loan_123...",
      "lender": "0x123...",
      "borrower": "0x456...", // null if not accepted
      "amount": "5000000",
      "interestRate": "5.5",
      "duration": 30,
      "status": "offered" | "accepted" | "repaid" | "defaulted",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "dueDate": "2024-01-31T00:00:00.000Z" // if accepted
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 10,
    "hasMore": true
  }
}
```

---

## Lending Accept API

### POST /api/lending/accept
Accept an existing lending offer.

**Request Body:**
```json
{
  "borrowerAddress": "0x456...",
  "loanId": "loan_123...",
  "acceptanceTerms": {
    "agreedAmount": "5000000",
    "agreedRate": "5.5",
    "agreedDuration": 30
  },
  "signedTransaction": { ... } // Optional: for executing acceptance
}
```

**Response (Unsigned Acceptance):**
```json
{
  "payload": {
    "type": "entry_function_payload", 
    "function": "0x1::P2PLending::accept_loan",
    "type_arguments": [],
    "arguments": ["loan_123...", "0x456..."]
  },
  "message": "Sign this transaction to accept loan offer",
  "requestId": "req_123...",
  "loanDetails": {
    "loanId": "loan_123...",
    "amount": "5000000",
    "interestRate": "5.5",
    "duration": 30
  }
}
```

**Response (Executed Acceptance):**
```json
{
  "success": true,
  "txId": "0x789...",
  "loanId": "loan_123...",
  "result": { ... },
  "loanDetails": {
    "borrower": "0x456...",
    "startDate": "2024-01-01T00:00:00.000Z",
    "dueDate": "2024-01-31T00:00:00.000Z",
    "totalRepayment": "5275000" // principal + interest
  },
  "requestId": "req_123..."
}
```

---

## Error Handling

### Error Response Format
All API errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": "Field 'amount' must be a positive number",
    "requestId": "req_123...",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Codes
- `VALIDATION_ERROR` (400): Invalid request parameters
- `RATE_LIMIT_ERROR` (429): Rate limit exceeded
- `BLOCKCHAIN_ERROR` (502): Blockchain network issues
- `PREDICTION_SERVICE_ERROR` (503): AI prediction service unavailable
- `INTERNAL_SERVER_ERROR` (500): Unexpected server error

### Rate Limiting Response
When rate limited, the API returns:
```json
{
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "message": "Rate limit exceeded. Please try again later.",
    "retryAfter": 60,
    "requestId": "req_123..."
  }
}
```

---

## Security Features

### Input Validation
- All inputs are validated against strict schemas
- Addresses are validated for proper format
- Amounts are checked for reasonable bounds
- SQL injection and XSS protection

### Transaction Security
- All blockchain transactions require proper signing
- Fraud detection for suspicious patterns
- Amount and frequency limits
- Address blacklist checking

### Data Protection
- Sensitive data is sanitized in logs
- Request IDs for audit trails
- No sensitive data in error messages (production)

---

## Monitoring and Observability

### Metrics
All endpoints track:
- Request count and rate
- Response time percentiles
- Error rates by type
- Business metrics (transfers, loans, predictions)

### Logging
Structured logging includes:
- Request/response correlation
- User actions and outcomes
- Performance metrics
- Error details and stack traces

### Health Monitoring
- Service dependency health checks
- Automated alerting on failures
- Performance degradation detection
- Uptime and availability tracking

---

## Environment Configuration

### Required Environment Variables
```bash
# Blockchain
APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1
APTOS_FAUCET_URL=https://faucet.mainnet.aptoslabs.com
LENDING_MODULE_ADDRESS=0x1

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
CORS_ORIGINS=https://your-frontend.com

# Rate Limiting  
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_WINDOW_MS=60000

# AI/ML
PYTHON_EXECUTABLE=python3
PYTHON_SCRIPT_TIMEOUT=30000
ENABLE_MODEL_CACHING=true
MODEL_CACHE_TTL=300000

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
HEALTH_CHECK_INTERVAL=30000

# Features
ENABLE_FRAUD_DETECTION=true
ENABLE_FEE_PREDICTION=true
MAX_TRANSFER_AMOUNT=1000000000
```

### Optional Environment Variables
```bash
# Database (if needed)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# External Services
EXTERNAL_API_KEY=your-api-key
NOTIFICATION_WEBHOOK_URL=https://...

# Development
NODE_ENV=production
NEXT_PUBLIC_APP_VERSION=1.0.0
DEBUG_MODE=false
```

---

## Development and Testing

### Local Development
1. Install dependencies: `npm install`
2. Set up environment: Copy `.env.example` to `.env.local`
3. Install Python dependencies: `pip install -r requirements.txt`
4. Start development server: `npm run dev`

### Testing
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Load testing
npm run test:load

# API testing
npm run test:api
```

### API Testing Examples
```bash
# Health check
curl -X GET http://localhost:3000/api/health

# Transfer (get payload)
curl -X POST http://localhost:3000/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "senderAddress": "0x123...",
    "recipientAddress": "0x456...",
    "amount": "1000000",
    "token": "APT"
  }'

# Prediction
curl -X POST http://localhost:3000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fee",
    "data": [0.5, 1000, 720]
  }'
```

---

## Production Deployment

### Requirements
- Node.js 18+ with TypeScript support
- Python 3.8+ with required ML libraries
- Redis for rate limiting and caching (optional)
- PostgreSQL for transaction history (optional)

### Performance Recommendations
- Use a CDN for static assets
- Implement connection pooling for database
- Enable response compression
- Configure proper caching headers
- Use horizontal scaling with load balancer

### Security Checklist
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure CORS for production domains
- [ ] Set up proper firewall rules
- [ ] Enable rate limiting and DDoS protection
- [ ] Regular security audits and updates
- [ ] Monitor for suspicious activity
- [ ] Implement proper logging and alerting

### Monitoring Setup
- [ ] Application performance monitoring (APM)
- [ ] Log aggregation and analysis
- [ ] Real-time alerting on errors
- [ ] Business metrics dashboards
- [ ] Uptime monitoring
- [ ] Database performance monitoring

---

## Support and Maintenance

### Troubleshooting
- Check health endpoint for service status
- Review application logs for error details
- Verify environment configuration
- Test blockchain connectivity
- Validate Python model availability

### Common Issues
1. **High response times**: Check Python model performance
2. **Transaction failures**: Verify Aptos node connectivity
3. **Rate limiting**: Adjust limits or implement Redis
4. **Prediction errors**: Check model files and Python setup

### Contact
- Technical Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Security Concerns: security@your-domain.com
- General Questions: api-support@your-domain.com
