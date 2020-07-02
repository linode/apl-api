# --------------- Dev stage for developers to override sources
FROM node:13.10.1-alpine as dev

RUN apk --no-cache add make gcc g++ python git
RUN apk --no-cache add git jq
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
RUN npm run build

# --------------- Cleanup
FROM dev as clean
# below command removes the packages specified in devDependencies and set NODE_ENV to production
RUN npm prune --production
# --------------- Production stage
FROM node:13.10.1-alpine AS prod

ARG HELM_VERSION=3.2.4
ENV HELM_FILE_NAME helm-v${HELM_VERSION}-linux-amd64.tar.gz
ARG HELM_SECRETS_VERSION=v2.0.2
ARG SOPS_VERSION=3.5.0

# sops
ADD https://github.com/mozilla/sops/releases/download/v${SOPS_VERSION}/sops-v${SOPS_VERSION}.linux /usr/bin/sops
RUN chmod +x /usr/bin/sops

# helm
ADD https://get.helm.sh/${HELM_FILE_NAME} /tmp
RUN tar -zxvf /tmp/${HELM_FILE_NAME} -C /tmp && mv /tmp/linux-amd64/helm /usr/bin/helm
RUN echo "exec $*" > /usr/bin/sudo && chmod +x /usr/bin/sudo
RUN helm plugin install https://github.com/futuresimple/helm-secrets --version ${HELM_SECRETS_VERSION}

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
