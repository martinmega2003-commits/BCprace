FROM node:22-bookworm-slim

WORKDIR /app

ENV EXPO_NO_TELEMETRY=1

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8081 19000 19001 19002

CMD ["npm", "run", "start", "--", "--host", "lan", "--port", "8081"]
