FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig*.json ./
COPY worker.ts ./
COPY src/ ./src/

# tsx runs TypeScript directly
CMD ["npx", "tsx", "worker.ts"]
