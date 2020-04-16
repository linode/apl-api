# --------------- Dev stage for developers to override sources
FROM node:13.10.1-alpine as dev

RUN apk --no-cache add make gcc g++ python

ENV NODE_ENV=development
ENV BLUEBIRD_DEBUG=0

RUN mkdir /app
WORKDIR /app

COPY package*.json ./

RUN npm ci

# --------------- ci stage for CI runner
FROM dev as ci

COPY . .eslintrc.yml ./
ARG CI=true
ENV NODE_ENV=test

RUN npm run lint
RUN npm run test

# --------------- Cleanup
FROM dev as clean

# below command removes the packages specified in devDependencies and set NODE_ENV to production
RUN npm prune --production

# --------------- Production stage
FROM alpine:3.11 AS prod

COPY --from=dev /usr/local/bin/node /usr/bin/
COPY --from=dev /usr/lib/libgcc* /usr/lib/
COPY --from=dev /usr/lib/libstdc* /usr/lib/

# Install dependencies
RUN apk add --no-cache git

# Install app
RUN mkdir /app
WORKDIR /app
COPY --from=clean /app/node_modules node_modules
COPY package.json .
COPY app.js .
COPY src src

USER 1001
EXPOSE 8080

CMD ["node", "app.js"]
