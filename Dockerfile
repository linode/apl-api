# --------------- Dev stage for developers to override sources
FROM node:13.7.0-alpine as dev

RUN apk --no-cache add make gcc g++ python

ENV NODE_ENV=development
ENV BLUEBIRD_DEBUG=0

RUN mkdir /app
WORKDIR /app

COPY package*.json ./

RUN npm ci

# --------------- ci stage for CI runner
FROM dev as ci

COPY --from=dev /app/node_modules node_modules
COPY . .eslintrc.yml ./
ARG CI=true
ENV NODE_ENV=test
# tests should be executed in parallel (on a good CI runner)
# by calling this 'ci' stage with different commands (i.e. npm run test:lint)

RUN pwd
RUN npm run lint
RUN npm run test

# --------------- Cleanup
FROM dev as clean
COPY . .eslintrc.yml ./
# below command removes the packages specified in devDependencies and set NODE_ENV to production
RUN npm prune --production
# --------------- Production stage
FROM alpine:3.11 AS prod


COPY --from=dev /usr/local/bin/node /usr/bin/
COPY --from=dev /usr/lib/libgcc* /usr/lib/libstdc* /usr/lib/

# Install dependencies

RUN apk add --no-cache git

# Install app


RUN mkdir /app
WORKDIR /app

COPY --from=clean /app/node_modules node_modules
COPY --from=clean /app/package.json /app/app.js ./
COPY --from=clean /app/src ./src

# Make sure that .env is not at this stage
RUN rm -f /app/.env

EXPOSE 8080


CMD ["node", "app.js"]