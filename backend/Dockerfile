FROM node:24.15.0-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV LISTEN_HOST=0.0.0.0

EXPOSE 3000

CMD ["npm", "run", "dev"]
