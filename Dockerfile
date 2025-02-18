FROM node:20.18.1-alpine as ci

ENV NODE_ENV=test
ENV BLUEBIRD_DEBUG=0
ENV HUSKY_SKIP_INSTALL=true
ARG CI=true

RUN mkdir /app
WORKDIR /app

COPY . .* ./

RUN npm ci

RUN npm run build
RUN npm run lint
RUN npm run test

# --------------- Cleanup
FROM ci as clean
# below command removes the packages specified in devDependencies and set NODE_ENV to production
RUN npm prune --production
# --------------- Production stage
FROM node:20.18.1-alpine AS prod

ENV NODE_ENV=production
ENV NODE_PATH='dist'

# Install dependencies
RUN apk --no-cache add python3 git jq openssh

# Install app
RUN mkdir /app
WORKDIR /app
COPY --from=clean /app/node_modules node_modules
COPY --from=ci /app/dist dist
COPY package.json .

USER node
EXPOSE 8080

CMD ["node", "--max-http-header-size", "16384", "dist/src/app.js"]
