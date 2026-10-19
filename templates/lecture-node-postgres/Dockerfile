FROM node:24-slim
WORKDIR /workspace
COPY package*.json ./
RUN npm install
COPY app ./app
COPY scripts ./scripts
# 再起動は Compose Watch (sync+restart) が外から行うので --watch は付けない
CMD ["node", "app/server.js"]
