# AUREA API - Production Dockerfile
# Multi-stage build for minimal image size

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production=false

# Copy source and build
COPY . .
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

# Copy production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Set permissions
RUN chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

# Environment
ENV NODE_ENV=production
ENV APP_HOST=0.0.0.0
ENV APP_PORT=3789

# Expose port
EXPOSE 3789

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3789/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "--enable-source-maps", "dist/index.js"]
