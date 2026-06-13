# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definitions and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and config files
COPY . .

# Set up build argument for VITE_BACKEND_URL
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Build the production React app
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine

# Copy built files from Builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
