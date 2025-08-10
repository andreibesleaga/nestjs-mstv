
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install --production
CMD [ "node", "dist/apps/api-gateway/src/main.js" ]
