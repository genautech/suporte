# Use the official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose port (Cloud Run will inject PORT env var)
EXPOSE 8080

# Start the application
CMD ["node", "index.js"]



