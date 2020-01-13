# --------------- Dev stage for developers to override sources
FROM node:11.15-alpine as dev

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
FROM ci as clean

# below command removes the packages specified in devDependencies and set NODE_ENV to production
RUN npm prune --production
# --------------- Production stage
FROM alpine:3.11 AS prod


COPY --from=dev /usr/local/bin/node /usr/bin/
COPY --from=dev /usr/lib/libgcc* /usr/lib/libstdc* /usr/lib/

# Install dependencies

RUN apk add --no-cache ca-certificates git bash curl jq

ARG KUBECTL_VERSION=1.15.6
ARG HELM_VERSION=3.0.2
ENV HELM_FILE_NAME helm-v${HELM_VERSION}-linux-amd64.tar.gz
ARG HELM_DIFF_VERSION=v3.0.0-rc.7
ARG HELMFILE_VERSION=0.98.1

## kubectl
ADD https://storage.googleapis.com/kubernetes-release/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl /usr/local/bin/kubectl
RUN chmod +x /usr/local/bin/kubectl

## helm
ADD https://get.helm.sh/${HELM_FILE_NAME} /tmp
RUN tar -zxvf /tmp/${HELM_FILE_NAME} -C /tmp \
  && mv /tmp/linux-amd64/helm /bin/helm \
  && rm -rf /tmp/*
RUN helm plugin install https://github.com/databus23/helm-diff --version ${HELM_DIFF_VERSION}

## helmfile
ADD https://github.com/roboll/helmfile/releases/download/v${HELMFILE_VERSION}/helmfile_linux_amd64 /usr/local/bin/helmfile
RUN chmod 0755 /usr/local/bin/helmfile

# Install app


RUN mkdir /app
WORKDIR /app

COPY --from=clean /app/node_modules node_modules
COPY --from=clean /app/package.json /app/app.js ./
COPY --from=clean /app/src ./src

EXPOSE 8080
ENV OTOMI_STACK_PATH="/otomi-stack"
ENV KUBE_CONTEXT="minikube"
ENV DEPLOYMENT_STAGE="DEV"

# Test if  binaries are available
RUN kubectl help
RUN helm help
RUN helmfile help

CMD ["node", "app.js"]