FROM node:20-alpine

WORKDIR /app

# Install openssl for Prisma client compatibility
RUN apk add --no-cache openssl

# Copy package definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and config files
COPY prisma ./prisma/
COPY tsconfig.json ./

# Copy source code
COPY src ./src/

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript to JavaScript
RUN npm run build

# Create directories for persistent SQLite DB and upload files
RUN mkdir -p /app/data /app/uploads

EXPOSE 3001

# Copy entrypoint script and make it executable
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
