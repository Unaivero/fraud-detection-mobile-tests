# Fraud Detection Mobile Tests - Docker Container
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    openjdk11-jre \
    android-tools \
    curl \
    git

# Install Appium globally
RUN npm install -g appium@latest

# Install Appium drivers
RUN appium driver install uiautomator2
RUN appium driver install xcuitest

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p logs allure-results allure-report screenshots

# Set permissions
RUN chmod +x ./start.js

# Environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Expose Appium port
EXPOSE 4723

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4723/wd/hub/status || exit 1

# Default command
CMD ["npm", "start"]