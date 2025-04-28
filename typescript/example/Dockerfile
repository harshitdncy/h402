FROM node:22-alpine3.21 AS base
RUN apk add --no-cache \
        python3 \
        build-base

FROM base AS build
WORKDIR /app
COPY ./ /app
RUN mv .npmrc.example .npmrc

RUN --mount=type=cache,target=/root/.npm \
    --mount=type=secret,id=npm-token,target=/run/secrets/npm-token \
    NPM_TOKEN=$(cat /run/secrets/npm-token) \
    npm ci

RUN npm run build

EXPOSE 3000/tcp
ENTRYPOINT [ "npm", "run", "start" ]