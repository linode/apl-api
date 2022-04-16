# --------------- Dev stage for developers to override sources
FROM node:17-slim as dev

ENV NODE_ENV=development
ENV BLUEBIRD_DEBUG=0
ENV HUSKY_SKIP_INSTALL=true

RUN mkdir /app
WORKDIR /app

COPY package*.json ./

RUN npm ci

# --------------- ci stage for CI runner
FROM dev as ci

COPY . .eslintrc.yml ./
ARG CI=true
ENV NODE_ENV=test

RUN npm run build && \
  npm run lint && \
  npm run test

# --------------- Cleanup
FROM dev as clean
# below command removes the packages specified in devDependencies and set NODE_ENV to production
RUN npm prune --production
# --------------- Production stage
FROM node:17.9-alpine AS prod

# Install dependencies
RUN apk --no-cache add python3 git jq

# Install app
RUN mkdir /app
WORKDIR /app
COPY --from=clean /app/node_modules node_modules
COPY --from=ci /app/dist dist
COPY package.json .

USER node
EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "--max-http-header-size", "16384", "dist/app.js"]
