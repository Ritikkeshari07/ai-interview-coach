FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm install && npm --prefix client install && npm --prefix server install
COPY client ./client
RUN npm --prefix client run build
COPY server ./server
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm --prefix server install --omit=dev
COPY server ./server
COPY --from=build /app/client/dist ./client/dist
EXPOSE 8080
CMD ["node", "server/src/index.js"]
