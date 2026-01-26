# Backend Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
COPY scripts ./scripts
COPY sql ./sql
COPY .env.example ./.env.example
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000
CMD ["node", "src/server.js"]
