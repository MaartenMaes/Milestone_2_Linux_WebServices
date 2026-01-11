# Use official Node.js image with Alpine Linux (lightweight)
# Alpine is a minimal Linux distribution (~150MB vs 900MB+ for full Node)
FROM node:18-alpine

# Set maintainer metadata
LABEL maintainer="maarten@mm.local" \
    description="Node.js API backend for milestone 2 app" \
    version="1.0"

# Set working directory inside container
# All subsequent commands execute relative to this directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
# Doing this before source code allows Docker to cache the npm install layer
# If code changes but dependencies don't, this layer is reused (faster builds)
COPY package*.json ./

# Install dependencies
# npm install reads package.json and installs specified versions
# --only=production could be used to skip dev dependencies
RUN npm install

# Copy application source code
# Source code is copied last because it changes frequently
# This maximizes Docker layer caching
COPY server.js ./

# EXPOSE documents that the service listens on port 3000
EXPOSE 3000

# HEALTHCHECK tells Docker how to verify if the container is healthy
# Docker will periodically send requests to /health endpoint
# If it fails 3 times consecutively, container is marked unhealthy
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
# "node server.js" is the default command when container starts
CMD ["npm", "start"]