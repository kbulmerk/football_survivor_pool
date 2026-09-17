FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY saturday-lock.js .
CMD ["node", "saturday-lock.js"]
