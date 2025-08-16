# Aptash Docker Deployment Guide

This guide explains how to deploy the Aptash project using Docker with all required environment variables properly configured.

## Quick Start

### 1. Environment Configuration

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

Edit `.env` with your specific configuration values.

### 2. Docker Deployment Options

#### Option A: Docker Compose (Recommended)
```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f aptash

# Stop the application
docker-compose down
```

#### Option B: Docker Build & Run
```bash
# Build the image
docker build -t aptash .

# Run the container
docker run -d \
  --name aptash \
  -p 3000:3000 \
  --env-file .env \
  aptash
```

## Environment Variables

### Required Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APTOS_NODE_URL` | Aptos RPC endpoint | `https://fullnode.testnet.aptoslabs.com/v1` |
| `NEXT_PUBLIC_NETWORK` | Network identifier | `testnet` |
| `LENDING_MODULE_ADDRESS` | Smart contract address | See `.env.example` |
| `FRAUD_LOG_MODULE_ADDRESS` | Fraud detection contract | See `.env.example` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | API rate limit | `60` |
| `MAX_TRANSFER_AMOUNT` | Maximum transfer limit | `1000000` |
| `ENABLE_BALANCE_VALIDATION` | Enable balance checks | `false` |
| `DATABASE_URL` | External database URL | Not required |

## Network Configuration

### Testnet (Default)
```env
APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
NEXT_PUBLIC_NETWORK=testnet
```

### Mainnet
```env
APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1
NEXT_PUBLIC_NETWORK=mainnet
```

### Devnet
```env
APTOS_NODE_URL=https://fullnode.devnet.aptoslabs.com/v1
NEXT_PUBLIC_NETWORK=devnet
```

## Production Deployment

### Security Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure appropriate rate limits
- [ ] Set realistic transfer/loan limits
- [ ] Use mainnet RPC endpoints for production
- [ ] Enable balance validation if needed
- [ ] Set up proper logging and monitoring

### Platform-Specific Deployment

#### Vercel
The `VERCEL_URL` environment variable is automatically set by Vercel.

#### Railway/Render
Set all environment variables through the platform's dashboard.

#### AWS/GCP/Azure
Use container services with environment variable injection.

## Health Checks

The application includes a health check endpoint at `/api/health` that verifies:
- API connectivity
- Aptos node connectivity  
- ML service status
- System health

Access: `http://localhost:3000/api/health`

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Change port in docker-compose.yml
   ports:
     - "3001:3000"  # Host:Container
   ```

2. **Environment variables not loading**
   ```bash
   # Verify .env file exists and has correct syntax
   cat .env
   
   # Check container environment
   docker exec aptash env
   ```

3. **ML models not found**
   ```bash
   # Ensure models directory is mounted
   ls -la models/
   ```

4. **Network connectivity issues**
   ```bash
   # Test Aptos node connectivity
   curl -X GET "https://fullnode.testnet.aptoslabs.com/v1/"
   ```

## Monitoring

The application provides several monitoring endpoints:

- `/api/health` - System health status
- `/api/ml-status` - ML service status
- Application logs via Docker

## Scaling

For production scaling:

1. Use a load balancer (nginx, HAProxy)
2. Set up horizontal pod autoscaling
3. Configure external caching (Redis)
4. Use external database for persistence
5. Set up proper monitoring (Prometheus, Grafana)

## Support

For deployment issues:
1. Check the application logs: `docker-compose logs aptash`
2. Verify environment variables: `docker exec aptash env | grep APTOS`
3. Test health endpoint: `curl http://localhost:3000/api/health`
4. Review network connectivity to Aptos nodes
