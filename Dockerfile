# ---- Base image ----
FROM node:20-alpine

# ---- Create app directory ----
WORKDIR /usr/src/app

# ---- Copy package files and install dependencies ----
COPY package*.json ./
RUN npm install --production

# ---- Copy remaining source code ----
COPY . .

# ---- Expose the port Cloud Run will use ----
ENV PORT=8000
EXPOSE 8000

# ---- Start the server ----
CMD ["node", "server.js"]
