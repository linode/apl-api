# --------------- Dev stage for developers to override sources
FROM node:14-slim as dev
ARG NPM_TOKEN
RUN test -n "$NPM_TOKEN"

ENV NODE_ENV=development
ENV BLUEBIRD_DEBUG=0

RUN mkdir /app
WORKDIR /app

COPY package*.json ./
COPY .npmrc ./
RUN echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" >> .npmrc

RUN npm ci

# --------------- ci stage for CI runner
FROM dev as ci

COPY . .eslintrc.yml ./
ARG CI=true
ENV NODE_ENV=test

RUN npm run lint && \
  npm run test && \
  npm run build

# --------------- Cleanup
FROM dev as clean
# below command removes the packages specified in devDependencies and set NODE_ENV to production
RUN npm prune --production
# --------------- Production stage
FROM node:14.10-alpine AS prod

# Install dependencies
RUN apk --no-cache add python git jq

# Install app
RUN mkdir /app
WORKDIR /app
COPY --from=clean /app/node_modules node_modules
COPY --from=ci /app/dist dist
COPY package.json .

USER node
EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "--max-http-header-size", "16384", "dist/src/app.js"]
