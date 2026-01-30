FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY embedding-server.js .

EXPOSE 3000

CMD ["node", "embedding-server.js"]
