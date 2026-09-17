FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY tuesday-open.js .
CMD ["node", "tuesday-open.js"]
