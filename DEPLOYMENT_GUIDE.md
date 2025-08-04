# Production Deployment Guide

## Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Unit tests passing (>90% coverage)
- [ ] Integration tests passing
- [ ] Security audit completed
- [ ] Performance benchmarks met

### Environment Setup
- [ ] Production environment variables configured
- [ ] SSL certificates installed and validated
- [ ] DNS records configured
- [ ] CDN setup completed
- [ ] Database migrations applied
- [ ] Redis cache configured

### Security Configuration
- [ ] CORS policies configured for production domains
- [ ] Rate limiting enabled and tuned
- [ ] API keys and secrets properly managed
- [ ] Firewall rules configured
- [ ] DDoS protection enabled
- [ ] Security headers configured

### Monitoring and Observability
- [ ] Application performance monitoring (APM) setup
- [ ] Log aggregation configured
- [ ] Error tracking enabled
- [ ] Uptime monitoring configured
- [ ] Business metrics dashboards created
- [ ] Alert rules configured

### Infrastructure
- [ ] Load balancer configured
- [ ] Auto-scaling policies defined
- [ ] Backup strategies implemented
- [ ] Disaster recovery plan documented
- [ ] Health checks configured
- [ ] Resource limits set

---

## Environment Configuration

### Production .env File
```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_VERSION=1.0.0
PORT=3000

# Blockchain Configuration
APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1
APTOS_FAUCET_URL=https://faucet.mainnet.aptoslabs.com
LENDING_MODULE_ADDRESS=0x1234567890abcdef1234567890abcdef12345678

# Security
JWT_SECRET=your-super-secure-jwt-secret-256-bits-long
ENCRYPTION_KEY=your-encryption-key-must-be-32-chars
CORS_ORIGINS=https://aptash.com,https://www.aptash.com
API_KEY_SALT=your-api-key-salt-for-hashing

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false
RATE_LIMIT_STORE=redis

# Redis Configuration (for rate limiting and caching)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT=5000

# Database Configuration (optional)
DATABASE_URL=postgresql://user:password@localhost:5432/aptash
DATABASE_POOL_SIZE=20
DATABASE_CONNECTION_TIMEOUT=5000

# AI/ML Configuration
PYTHON_EXECUTABLE=/usr/bin/python3
PYTHON_SCRIPT_TIMEOUT=30000
ENABLE_MODEL_CACHING=true
MODEL_CACHE_TTL=300000
MODEL_CACHE_MAX_SIZE=1000

# Monitoring and Logging
LOG_LEVEL=info
LOG_FORMAT=json
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000

# Feature Flags
ENABLE_FRAUD_DETECTION=true
ENABLE_FEE_PREDICTION=true
ENABLE_DETAILED_LOGGING=false
ENABLE_DEBUG_ENDPOINTS=false

# Business Logic Limits
MAX_TRANSFER_AMOUNT=1000000000
MIN_TRANSFER_AMOUNT=1000
MAX_LOAN_AMOUNT=10000000000
MIN_LOAN_AMOUNT=100000
MAX_LOAN_DURATION_DAYS=365
MIN_LOAN_DURATION_DAYS=1
MAX_INTEREST_RATE=50.0
MIN_INTEREST_RATE=0.1

# External Services
NOTIFICATION_WEBHOOK_URL=https://your-notification-service.com/webhook
ANALYTICS_API_KEY=your-analytics-api-key
BACKUP_S3_BUCKET=aptash-backups
BACKUP_S3_REGION=us-east-1

# Performance Tuning
REQUEST_TIMEOUT=30000
KEEP_ALIVE_TIMEOUT=65000
HEADERS_TIMEOUT=66000
MAX_REQUEST_SIZE=10mb
COMPRESSION_THRESHOLD=1024

# Circuit Breaker Configuration
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
CIRCUIT_BREAKER_RESET_TIMEOUT=30000
```

---

## Docker Configuration

### Dockerfile
```dockerfile
# Multi-stage build for production optimization
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM python:3.11-alpine AS python-deps
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM node:18-alpine AS runner
WORKDIR /app

# Install Python for AI models
RUN apk add --no-cache python3 py3-pip

# Copy Python dependencies
COPY --from=python-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/src/scripts ./src/scripts
COPY --from=builder --chown=nextjs:nodejs /app/*.pth ./
COPY --from=builder --chown=nextjs:nodejs /app/*.pkl ./

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  aptash-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 3s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: aptash
      POSTGRES_USER: ${DATABASE_USER}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DATABASE_USER}"]
      interval: 30s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - aptash-api
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## Nginx Configuration

### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    upstream aptash_backend {
        server aptash-api:3000;
        keepalive 32;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=health:10m rate=1r/s;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    server {
        listen 80;
        server_name aptash.com www.aptash.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name aptash.com www.aptash.com;

        ssl_certificate /etc/nginx/ssl/aptash.crt;
        ssl_certificate_key /etc/nginx/ssl/aptash.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

        # Health check endpoint with lighter rate limiting
        location /api/health {
            limit_req zone=health burst=5 nodelay;
            proxy_pass http://aptash_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API endpoints with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://aptash_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Static files with caching
        location /static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            proxy_pass http://aptash_backend;
        }
    }
}
```

---

## Kubernetes Configuration

### deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aptash-api
  labels:
    app: aptash-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aptash-api
  template:
    metadata:
      labels:
        app: aptash-api
    spec:
      containers:
      - name: aptash-api
        image: aptash/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: aptash-secrets
              key: redis-url
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: aptash-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: aptash-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: aptash-api-service
spec:
  selector:
    app: aptash-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

---

## Monitoring Setup

### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'aptash-api'
    static_configs:
      - targets: ['aptash-api:9090']
    metrics_path: /metrics
    scrape_interval: 10s

rule_files:
  - "aptash_alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Aptash API Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(api_calls_total[5m])",
            "legendFormat": "{{endpoint}} - {{method}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph", 
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(api_request_duration_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(api_errors_total[5m])",
            "legendFormat": "{{endpoint}} errors"
          }
        ]
      }
    ]
  }
}
```

---

## Database Setup

### PostgreSQL Schema
```sql
-- Transaction history table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    tx_id VARCHAR(66) UNIQUE NOT NULL,
    from_address VARCHAR(66) NOT NULL,
    to_address VARCHAR(66) NOT NULL,
    amount BIGINT NOT NULL,
    token VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    fee BIGINT,
    block_height BIGINT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    request_id VARCHAR(50),
    metadata JSONB
);

-- Lending offers table
CREATE TABLE lending_offers (
    id SERIAL PRIMARY KEY,
    loan_id VARCHAR(50) UNIQUE NOT NULL,
    lender_address VARCHAR(66) NOT NULL,
    borrower_address VARCHAR(66),
    amount BIGINT NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    duration_days INTEGER NOT NULL,
    token VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    tx_id VARCHAR(66),
    metadata JSONB
);

-- Prediction logs table
CREATE TABLE prediction_logs (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,
    prediction_type VARCHAR(20) NOT NULL,
    input_data JSONB NOT NULL,
    prediction_result JSONB NOT NULL,
    model_version VARCHAR(20),
    confidence DECIMAL(5,4),
    processing_time_ms INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transactions_from_address ON transactions(from_address);
CREATE INDEX idx_transactions_to_address ON transactions(to_address);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_lending_offers_lender ON lending_offers(lender_address);
CREATE INDEX idx_lending_offers_status ON lending_offers(status);
CREATE INDEX idx_prediction_logs_type ON prediction_logs(prediction_type);
```

---

## Security Configuration

### Firewall Rules (UFW)
```bash
# Allow SSH (adjust port as needed)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow specific application ports
ufw allow 3000/tcp  # API
ufw allow 6379/tcp  # Redis (restrict to internal network)
ufw allow 5432/tcp  # PostgreSQL (restrict to internal network)

# Enable firewall
ufw --force enable
```

### Fail2Ban Configuration
```ini
# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-req-limit]
enabled = true
filter = nginx-req-limit
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
maxretry = 10
findtime = 600
bantime = 7200
```

---

## Performance Optimization

### Node.js Configuration
```javascript
// server.js optimizations
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Start the application
  require('./app.js');
}
```

### Redis Configuration
```conf
# redis.conf optimizations
maxmemory 1gb
maxmemory-policy allkeys-lru
tcp-keepalive 300
timeout 0
save 900 1
save 300 10
save 60 10000
```

---

## Backup and Recovery

### Database Backup Script
```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgresql"
DB_NAME="aptash"

# Create backup
pg_dump -h localhost -U $DATABASE_USER $DB_NAME | gzip > $BACKUP_DIR/aptash_$DATE.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/aptash_$DATE.sql.gz s3://$BACKUP_S3_BUCKET/postgresql/

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "aptash_*.sql.gz" -mtime +7 -delete
```

### Model Files Backup
```bash
#!/bin/bash
# backup-models.sh

DATE=$(date +%Y%m%d_%H%M%S)
MODEL_DIR="/app"
BACKUP_DIR="/backups/models"

# Backup AI model files
tar -czf $BACKUP_DIR/models_$DATE.tar.gz $MODEL_DIR/*.pth $MODEL_DIR/*.pkl

# Upload to S3
aws s3 cp $BACKUP_DIR/models_$DATE.tar.gz s3://$BACKUP_S3_BUCKET/models/
```

---

## Troubleshooting Guide

### Common Issues

#### High Memory Usage
- Check for memory leaks in prediction models
- Monitor Python process memory consumption
- Implement model result caching limits
- Review garbage collection settings

#### Slow Response Times
- Monitor database query performance
- Check Aptos node connectivity
- Review Python script execution times
- Analyze network latency

#### Transaction Failures
- Verify Aptos node connectivity
- Check gas price configurations
- Monitor blockchain network status
- Review transaction signing process

### Debugging Commands
```bash
# Check application logs
docker logs aptash-api

# Monitor resource usage
docker stats aptash-api

# Check database connections
docker exec -it postgres psql -U aptash -c "SELECT count(*) FROM pg_stat_activity;"

# Test API endpoints
curl -s http://localhost:3000/api/health | jq

# Check Redis cache
docker exec -it redis redis-cli info memory
```

---

## Maintenance Tasks

### Daily Tasks
- [ ] Check application health status
- [ ] Review error logs and alerts
- [ ] Monitor key business metrics
- [ ] Verify backup completion

### Weekly Tasks
- [ ] Review performance metrics
- [ ] Update security patches
- [ ] Analyze usage patterns
- [ ] Test disaster recovery procedures

### Monthly Tasks
- [ ] Security audit and review
- [ ] Performance optimization review
- [ ] Capacity planning assessment
- [ ] Documentation updates

### Quarterly Tasks
- [ ] Full security penetration testing
- [ ] Business continuity testing
- [ ] Infrastructure cost optimization
- [ ] Technology stack review

This comprehensive deployment guide ensures your Aptash API is production-ready with all necessary security, monitoring, and operational procedures in place.
