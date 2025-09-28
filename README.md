# Aptash - DeFi Platform on Aptos

A modern decentralized finance platform built with Next.js 15, featuring AI-powered fraud detection and fee prediction on the Aptos blockchain.

## 🚀 Quick Deploy to Vercel

### Option 1: GitHub (Recommended)
```bash
# Setup for GitHub
./setup-github.sh

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/aptash.git
git push -u origin main

# Deploy: Go to vercel.com/new and import your repository
```

### Option 2: ZIP Upload
```bash
# Create deployment ZIP
./create-zip.sh

# Upload to vercel.com/new
```

## ⚙️ Environment Variables

Add these in Vercel dashboard:
```
APTOS_NODE_URL=https://fullnode.devnet.aptoslabs.com/v1
NEXT_PUBLIC_NETWORK=devnet
LENDING_MODULE_ADDRESS=0x78dd94137dd54a26e88eca378a0255f1d22435d49cec2467a4f3c5a8cf3e70ce
FRAUD_LOG_MODULE_ADDRESS=0x78dd94137dd54a26e88eca378a0255f1d22435d49cec2467a4f3c5a8cf3e70ce
PYTHON_EXECUTABLE=python3
RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

## � Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🎯 Features

- ✅ Next.js 15 with App Router
- ✅ Python AI/ML functions (fee prediction, fraud detection)
- ✅ Aptos blockchain integration
- ✅ Dark theme UI with Tailwind CSS
- ✅ P2P lending marketplace
- ✅ Real-time transaction monitoring
- ✅ Rate limiting and security

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/            # React components
└── lib/                   # Utilities and configurations

api/                       # Python serverless functions
sources/                   # Move smart contracts
public/                    # Static assets
```

## 🌐 Deployment

Your app will be live at: `https://aptash-abc123.vercel.app`

Endpoints:
- Main app: `/`
- API health: `/api/health`
- Python AI: `/api/predict.py`
- Fraud detection: `/api/fraud-detection.py`

Built with ❤️ for the Aptos ecosystem
