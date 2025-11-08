# Use a small Node 20 image
FROM node:20-alpine AS base

# Create app directory
WORKDIR /usr/src/app

# Install only production deps using lockfile
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the source
COPY . .

# Ensure the runtime port is 8080 for Cloud Run
ENV NODE_ENV=production
ENV PORT=8080

# Drop privileges (run as non-root "node" user)
USER node

# Expose the port (for local runs; Cloud Run respects PORT env)
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
