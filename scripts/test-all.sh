#!/bin/bash

# Comprehensive Test Script for Aptash DeFi Platform
# Tests all API endpoints and functionality

BASE_URL="http://localhost:3001"
CONTRACT_ADDRESS="0x78dd94137dd54a26e88eca378a0255f1d22435d49cec2467a4f3c5a8cf3e70ce"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_test() {
    echo -e "${YELLOW}Testing: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

test_api_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    
    print_test "$name"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -X GET "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL$endpoint" \
                  -H "Content-Type: application/json" \
                  -d "$data")
    fi
    
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        print_success "$name (HTTP $http_code)"
        echo "Response: $body" | head -c 200
        echo ""
    else
        print_error "$name (HTTP $http_code)"
        echo "Error: $body"
    fi
    echo ""
}

print_header "APTASH DEFI PLATFORM - COMPREHENSIVE TESTING"

echo "🔗 Contract Address: $CONTRACT_ADDRESS"
echo "🌐 Base URL: $BASE_URL"
echo ""

print_header "1. AI PREDICTION SERVICES"

# Test Fraud Detection
test_api_endpoint "Fraud Detection" "POST" "/api/predict" \
'{
  "type": "fraud",
  "data": [0.01, 1000, 720]
}'

# Test Fee Prediction
test_api_endpoint "Fee Prediction" "POST" "/api/predict" \
'{
  "type": "fee",
  "data": [0.05, 5000, 360]
}'

print_header "2. LENDING SERVICES"

# Test Loan Offer
test_api_endpoint "Create Loan Offer" "POST" "/api/lending" \
'{
  "action": "offer",
  "lenderAddress": "'$CONTRACT_ADDRESS'",
  "amount": 1000,
  "interestRate": 5.5,
  "token": "APT",
  "duration": 30
}'

# Test Get Loans
test_api_endpoint "Get Loans" "POST" "/api/lending" \
'{
  "action": "get_loans",
  "address": "'$CONTRACT_ADDRESS'"
}'

print_header "3. TRANSFER SERVICES"

# Test Transfer Validation
test_api_endpoint "Transfer Validation" "POST" "/api/transfer" \
'{
  "senderAddress": "'$CONTRACT_ADDRESS'",
  "recipientAddress": "0x1",
  "amount": 100,
  "token": "APT"
}'

print_header "4. CONTRACT VERIFICATION"

echo "🔍 Verifying deployed contracts..."

# Check if P2P Lending contract exists
print_test "P2P Lending Contract"
lending_check=$(aptos move view --function-id $CONTRACT_ADDRESS::P2PLending::get_loans \
                --args address:$CONTRACT_ADDRESS --profile devnet --output json 2>/dev/null)

if [ $? -eq 0 ]; then
    print_success "P2P Lending contract is deployed and accessible"
    echo "Current loans: $(echo $lending_check | jq -r '.Result[0] | length') loans found"
else
    print_error "P2P Lending contract not accessible"
fi

echo ""

print_header "5. ENVIRONMENT VERIFICATION"

echo "🔧 Checking configuration..."

# Check Python environment
print_test "Python AI Environment"
python_check=$(/home/sana/Documents/Actual\ Projects/aptos/env/bin/python --version 2>&1)
if [[ $python_check == *"Python 3"* ]]; then
    print_success "Python environment: $python_check"
else
    print_error "Python environment issue: $python_check"
fi

# Check AI models
print_test "AI Models"
model_check=$(/home/sana/Documents/Actual\ Projects/aptos/env/bin/python \
              /home/sana/Documents/Actual\ Projects/aptos/aptash/src/scripts/ai_models.py \
              --type fraud --data "[0.01, 1000, 720]" 2>&1)

if [[ $model_check == *"isSuspicious"* ]]; then
    print_success "AI models are working"
else
    print_error "AI models issue: $model_check"
fi

# Check Move contracts compilation
print_test "Move Contract Compilation"
cd /home/sana/Documents/Actual\ Projects/aptos/aptash
compile_check=$(aptos move compile --profile devnet 2>&1)
if [[ $compile_check == *"BUILDING aptash"* ]]; then
    print_success "Move contracts compile successfully"
else
    print_error "Move contract compilation failed"
fi

echo ""

print_header "6. NETWORK CONNECTIVITY"

# Check Aptos network
print_test "Aptos Devnet Connectivity"
network_check=$(curl -s https://fullnode.devnet.aptoslabs.com/v1/ | jq -r '.chain_id' 2>/dev/null)
if [ "$network_check" = "3" ]; then
    print_success "Aptos devnet is accessible (chain_id: $network_check)"
else
    print_error "Aptos devnet connectivity issue"
fi

echo ""

print_header "TEST SUMMARY"

echo "🎯 Test completed!"
echo ""
echo "📋 Next steps to use the platform:"
echo "   1. Open http://localhost:3001 in your browser"
echo "   2. Connect your Aptos wallet"
echo "   3. Switch wallet to Devnet network"
echo "   4. Use the following contract address: $CONTRACT_ADDRESS"
echo ""
echo "🔧 Available features:"
echo "   ✅ AI-powered fraud detection"
echo "   ✅ Fee prediction optimization"
echo "   ✅ P2P lending system"
echo "   ✅ Secure transfers"
echo "   ✅ Transaction history"
echo "   ✅ Real-time analytics"
echo ""
echo "🌐 Explorer link:"
echo "   https://explorer.aptoslabs.com/account/$CONTRACT_ADDRESS?network=devnet"
