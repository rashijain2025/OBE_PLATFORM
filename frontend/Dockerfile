# Use an official Node runtime as a parent image, slim version for reduced size
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache for dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port Vite runs on
EXPOSE 5173

# Start Vite dev server with host flag to allow external connections from the host machine
CMD ["npm", "run", "dev", "--", "--host"]
