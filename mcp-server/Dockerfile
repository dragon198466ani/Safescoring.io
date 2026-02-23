FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY index.js ./
COPY README.md ./
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "index.js"]
