
FROM node:20-alpine

# Install build dependencies for native modules and OpenSSL
RUN apk add --no-cache python3 make g++ openssl openssl-dev

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml .pnpmrc ./

# Install all dependencies (including devDependencies for development)
RUN pnpm install --ignore-scripts=false
# Force rebuild bcrypt with proper bindings
RUN cd node_modules/.pnpm/bcrypt* && npm rebuild bcrypt || true

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm prisma:generate

# Default command - this will be overridden by docker-compose
CMD [ "pnpm", "start:dev" ]
