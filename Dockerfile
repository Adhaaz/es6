FROM node:18

RUN apt-get update && \
  apt-get install -y \
  neofetch \
  ffmpeg && \
  rm -rf /var/lib/apt/lists/*

COPY package.json .
RUN npm install
RUN npm install -g pm2
COPY . .
EXPOSE 5000

CMD pm2-runtime index.js --name memecks
