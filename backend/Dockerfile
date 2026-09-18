# Use an official Node runtime, slim version for efficiency
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Copy only package files first to utilize Docker layer caching
COPY package*.json ./

# Install dependencies (nodemon is a dev dependency, so npm install handles it)
RUN npm install

# Copy the rest of the backend code
COPY . .

# Expose the backend port
EXPOSE 5000

# Use nodemon (via npx) to watch for file changes and restart the server
CMD ["npx", "nodemon", "index.js"]
