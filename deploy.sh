#!/bin/bash

# Production Deployment Script for Aptash
# This script handles the deployment process for the Aptos remittance app

set -e  # Exit on any error

echo "🚀 Starting Aptash Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    fi
    
    print_status "All dependencies are available"
}

# Setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Copy environment file if it doesn't exist
    if [ ! -f .env.local ]; then
        if [ -f .env.example ]; then
            cp .env.example .env.local
            print_warning "Created .env.local from .env.example. Please update with your actual values."
        else
            print_error ".env.example not found. Please create environment configuration."
            exit 1
        fi
    fi
    
    print_status "Environment setup complete"
}

# Install Node.js dependencies
install_node_dependencies() {
    print_status "Installing Node.js dependencies..."
    npm ci --production=false
    print_status "Node.js dependencies installed"
}

# Setup Python environment for AI models
setup_python_environment() {
    print_status "Setting up Python environment..."
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install Python dependencies
    print_status "Installing Python dependencies..."
    pip install --upgrade pip
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    pip install scikit-learn joblib numpy
    
    print_status "Python environment setup complete"
}

# Build the application
build_application() {
    print_status "Building Next.js application..."
    
    # Set production environment
    export NODE_ENV=production
    
    # Build the application
    npm run build
    
    if [ $? -eq 0 ]; then
        print_status "Build completed successfully"
    else
        print_error "Build failed"
        exit 1
    fi
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Type checking
    print_status "Running TypeScript type check..."
    npx tsc --noEmit
    
    # Linting
    print_status "Running ESLint..."
    npm run lint
    
    # Test AI models
    print_status "Testing AI models..."
    source venv/bin/activate
    python3 src/scripts/ai_models.py --type fee --data '[0.01, 500, 600]' > /dev/null
    python3 src/scripts/ai_models.py --type fraud --data '[0.01, 500, 600]' > /dev/null
    
    print_status "All tests passed"
}

# Security checks
security_checks() {
    print_status "Running security checks..."
    
    # Check for sensitive data in environment
    if grep -q "your_.*_here" .env.local 2>/dev/null; then
        print_warning "Found placeholder values in .env.local. Please update with actual values."
    fi
    
    # Check for production environment variables
    if [ -z "$APTOS_NODE_URL" ]; then
        print_warning "APTOS_NODE_URL not set in environment"
    fi
    
    # Audit npm packages
    print_status "Auditing npm packages..."
    npm audit --audit-level=high
    
    print_status "Security checks completed"
}

# Prepare for deployment
prepare_deployment() {
    print_status "Preparing deployment..."
    
    # Create deployment directory
    mkdir -p deployment
    
    # Copy necessary files
    cp -r .next deployment/
    cp -r public deployment/
    cp package.json deployment/
    cp package-lock.json deployment/
    cp next.config.ts deployment/
    
    # Copy Python models if they exist
    if [ -f "fee_predictor.pth" ]; then
        cp fee_predictor.pth deployment/
    fi
    
    if [ -f "fraud_detector.pkl" ]; then
        cp fraud_detector.pkl deployment/
    fi
    
    # Copy Python environment
    cp -r venv deployment/
    
    print_status "Deployment preparation complete"
}

# Generate deployment manifest
generate_manifest() {
    print_status "Generating deployment manifest..."
    
    cat > deployment/manifest.json << EOF
{
  "name": "aptash",
  "version": "$(node -p "require('./package.json').version")",
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "nodeVersion": "$(node -v)",
  "environment": "production",
  "features": [
    "aptos-integration",
    "ai-predictions",
    "fraud-detection",
    "p2p-lending"
  ],
  "dependencies": {
    "node": "$(node -v)",
    "python": "$(python3 --version | cut -d' ' -f2)"
  }
}
EOF
    
    print_status "Deployment manifest generated"
}

# Main deployment function
main() {
    print_status "Starting production deployment process..."
    
    check_dependencies
    setup_environment
    install_node_dependencies
    setup_python_environment
    run_tests
    security_checks
    build_application
    prepare_deployment
    generate_manifest
    
    print_status "🎉 Deployment preparation completed successfully!"
    print_status "Deployment files are ready in the 'deployment' directory"
    print_status ""
    print_status "Next steps:"
    print_status "1. Update .env.local with production values"
    print_status "2. Deploy the 'deployment' directory to your server"
    print_status "3. Run 'npm start' on your server to start the application"
    print_status ""
    print_warning "Remember to:"
    print_warning "- Set up proper SSL certificates"
    print_warning "- Configure your domain and DNS"
    print_warning "- Set up monitoring and logging"
    print_warning "- Configure your Aptos Move contracts"
}

# Parse command line arguments
case "${1:-}" in
    "check")
        check_dependencies
        ;;
    "build")
        build_application
        ;;
    "test")
        run_tests
        ;;
    "security")
        security_checks
        ;;
    *)
        main
        ;;
esac
