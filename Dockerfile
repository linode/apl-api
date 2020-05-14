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
# RUN npm run test
RUN npm run build

# --------------- Cleanup
FROM dev as clean
# below command removes the packages specified in devDependencies and set NODE_ENV to production
RUN npm prune --production
# --------------- Production stage
FROM node:13.10.1-alpine AS prod


COPY --from=dev /usr/local/bin/node /usr/bin/
COPY --from=dev /usr/lib/libgcc* /usr/lib/
COPY --from=dev /usr/lib/libstdc* /usr/lib/

# Install dependencies
RUN apk add --no-cache git jq

# Install app
RUN mkdir /app
WORKDIR /app
COPY --from=clean /app/node_modules node_modules
COPY --from=ci /app/dist dist
COPY package.json .
COPY bin bin

USER node
EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "--max-http-header-size", "16384", "dist/app.js"]
