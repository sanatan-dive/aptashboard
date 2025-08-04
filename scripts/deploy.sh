#!/bin/bash

# Aptash Move Contract Deployment Script
# Usage: ./deploy.sh [network] [profile]
# Example: ./deploy.sh testnet default
#          ./deploy.sh devnet devnet

NETWORK=${1:-devnet}
PROFILE=${2:-devnet}

echo "🚀 Deploying Aptash contracts to $NETWORK using profile $PROFILE"

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

# Check if aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    print_error "Aptos CLI is not installed. Please install it first."
    exit 1
fi

# Set the account address based on network/profile
if [ "$PROFILE" = "devnet" ]; then
    ACCOUNT_ADDRESS="0x78dd94137dd54a26e88eca378a0255f1d22435d49cec2467a4f3c5a8cf3e70ce"
elif [ "$PROFILE" = "default" ]; then
    ACCOUNT_ADDRESS="0x1bef5479fca5cb6fa103c439fe42a551965736d1262e8f8e865a691c0028234f"
else
    print_error "Unknown profile: $PROFILE"
    exit 1
fi

print_status "Using account: $ACCOUNT_ADDRESS"

# Update Move.toml with correct account address
print_status "Updating Move.toml with account address..."
cat > Move.toml << EOF
[package]
name = "aptash"
version = "0.0.1"
authors = ["Sanatan sharma"]

[addresses]
aptash = "$ACCOUNT_ADDRESS"

[dependencies]
AptosFramework = { git = "https://github.com/aptos-labs/aptos-core.git", subdir = "aptos-move/framework/aptos-framework", rev = "aptos-node-v1.15.0" }
EOF

# Check account balance
print_status "Checking account balance..."
BALANCE=$(aptos account balance --profile $PROFILE --output json | jq -r '.Result[0].balance')

if [ "$BALANCE" = "0" ] || [ "$BALANCE" = "null" ]; then
    print_warning "Account has no balance. Attempting to fund from faucet..."
    
    if [ "$NETWORK" = "devnet" ]; then
        aptos account fund-with-faucet --profile $PROFILE --amount 100000000
        if [ $? -eq 0 ]; then
            print_status "Successfully funded account from devnet faucet"
        else
            print_error "Failed to fund account from faucet"
            exit 1
        fi
    else
        print_warning "Testnet faucet may require manual funding. Please visit:"
        print_warning "https://aptos.dev/network/faucet"
        print_warning "Account address: $ACCOUNT_ADDRESS"
        read -p "Press enter when account is funded..."
    fi
else
    print_status "Account balance: $BALANCE Octas"
fi

# Compile contracts
print_status "Compiling Move contracts..."
aptos move compile --profile $PROFILE
if [ $? -ne 0 ]; then
    print_error "Contract compilation failed"
    exit 1
fi

print_status "Compilation successful!"

# Deploy contracts
print_status "Publishing contracts to $NETWORK..."
aptos move publish --profile $PROFILE --assume-yes
if [ $? -ne 0 ]; then
    print_error "Contract deployment failed"
    exit 1
fi

print_status "Contracts successfully deployed!"

# Initialize contracts
print_status "Initializing P2P Lending contract..."
aptos move run --function-id ${ACCOUNT_ADDRESS}::P2PLending::init --profile $PROFILE --assume-yes
if [ $? -ne 0 ]; then
    print_warning "P2P Lending initialization failed (might already be initialized)"
fi

print_status "Initializing Fraud Log contract..."
aptos move run --function-id ${ACCOUNT_ADDRESS}::FraudLog::initialize --profile $PROFILE --assume-yes
if [ $? -ne 0 ]; then
    print_warning "Fraud Log initialization failed (might already be initialized)"
fi

# Test contracts
print_status "Testing deployed contracts..."
LOANS_RESULT=$(aptos move view --function-id ${ACCOUNT_ADDRESS}::P2PLending::get_loans --args address:${ACCOUNT_ADDRESS} --profile $PROFILE --output json)
if [ $? -eq 0 ]; then
    print_status "✅ P2P Lending contract is working properly"
else
    print_warning "⚠️  P2P Lending contract test failed"
fi

# Update .env file
print_status "Updating .env file with deployed contract addresses..."

# Create .env backup
cp .env .env.backup

# Update environment variables
if [ "$NETWORK" = "devnet" ]; then
    sed -i "s|APTOS_NODE_URL=.*|APTOS_NODE_URL=https://fullnode.devnet.aptoslabs.com/v1|" .env
    sed -i "s|APTOS_FAUCET_URL=.*|APTOS_FAUCET_URL=https://faucet.devnet.aptoslabs.com|" .env
    sed -i "s|NEXT_PUBLIC_NETWORK=.*|NEXT_PUBLIC_NETWORK=devnet|" .env
else
    sed -i "s|APTOS_NODE_URL=.*|APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1|" .env
    sed -i "s|APTOS_FAUCET_URL=.*|APTOS_FAUCET_URL=https://faucet.testnet.aptoslabs.com|" .env
    sed -i "s|NEXT_PUBLIC_NETWORK=.*|NEXT_PUBLIC_NETWORK=testnet|" .env
fi

sed -i "s|LENDING_MODULE_ADDRESS=.*|LENDING_MODULE_ADDRESS=${ACCOUNT_ADDRESS}|" .env
sed -i "s|FRAUD_LOG_MODULE_ADDRESS=.*|FRAUD_LOG_MODULE_ADDRESS=${ACCOUNT_ADDRESS}|" .env

print_status "✅ Deployment complete!"
echo ""
echo "📋 Deployment Summary:"
echo "   Network: $NETWORK"
echo "   Account: $ACCOUNT_ADDRESS"
echo "   P2P Lending: ${ACCOUNT_ADDRESS}::P2PLending"
echo "   Fraud Log: ${ACCOUNT_ADDRESS}::FraudLog"
echo ""
echo "🌐 Explorer Link:"
echo "   https://explorer.aptoslabs.com/account/${ACCOUNT_ADDRESS}?network=${NETWORK}"
echo ""
echo "🔧 Next Steps:"
echo "   1. Start the Next.js development server: npm run dev"
echo "   2. Test the application at http://localhost:3000"
echo "   3. Connect wallet and interact with deployed contracts"
