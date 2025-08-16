# Use Node.js 18 LTS as base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

# Essential environment variables with defaults
ENV APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
ENV NEXT_PUBLIC_NETWORK=testnet
ENV NEXT_PUBLIC_APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1
ENV NEXT_PUBLIC_APP_VERSION=1.0.0

# Rate limiting configuration
ENV RATE_LIMIT_REQUESTS_PER_MINUTE=60
ENV RATE_LIMIT_WINDOW_MS=60000

# Transfer/Transaction configuration
ENV MAX_TRANSFER_AMOUNT=1000000
ENV MIN_TRANSFER_AMOUNT=0.000001
ENV TRANSACTION_TIMEOUT=30000

# Lending configuration
ENV LENDING_MODULE_ADDRESS=0x1
ENV MAX_LOAN_AMOUNT=100000
ENV MIN_LOAN_AMOUNT=1
ENV MAX_INTEREST_RATE=50
ENV MIN_INTEREST_RATE=0.1

# Token addresses (with fallback defaults)
ENV USDC_TOKEN_ADDRESS=0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC
ENV USDT_TOKEN_ADDRESS=0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT

# Security and validation
ENV ENABLE_BALANCE_VALIDATION=false

# Python configuration
ENV PYTHON_EXECUTABLE=python3

# API configuration
ENV API_VERSION=v1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy ML models and services
COPY --from=builder /app/models ./models
COPY --from=builder /app/ml_services ./ml_services
COPY --from=builder /app/api ./api
COPY --from=builder /app/ml_app.py ./ml_app.py
COPY --from=builder /app/requirements.txt ./requirements.txt

# Install Python and ML dependencies
RUN apk add --no-cache python3 py3-pip
RUN pip3 install --no-cache-dir -r requirements.txt

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
