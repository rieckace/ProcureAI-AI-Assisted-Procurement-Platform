FROM node:20-alpine

WORKDIR /app

# OpenSSL is required by the Prisma query engine at runtime
RUN apk add --no-cache openssl

# Install dependencies first for better layer caching
# (--ignore-scripts: prisma generate runs below once the schema is copied)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Generate the Prisma client from the schema
COPY prisma ./prisma
RUN npx prisma generate

# Copy application source and bootstrap script
COPY src ./src
COPY scripts ./scripts

# Ensure the uploads directory exists (multer writes attachments here)
RUN mkdir -p uploads

EXPOSE 5001

# Bootstrap runs: wait for DB -> prisma db push -> optional seed, then starts the server
CMD ["sh", "-c", "node scripts/bootstrap.js && node src/index.js"]
