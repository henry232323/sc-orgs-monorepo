FROM node:24-alpine AS release

RUN apk add --no-cache git postgresql-client

WORKDIR /app

# keep this
RUN yarn global add typescript
COPY package.json ./

RUN yarn install

COPY . .
RUN yarn build

# Copy and set entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["node", "dist/index.js"]
EXPOSE 3001
