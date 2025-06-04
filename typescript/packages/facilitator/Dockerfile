FROM node:22-alpine3.21 AS base
RUN apk add --no-cache \
        python3 \
        build-base

FROM base AS build

RUN --mount=type=cache,target=/root/.npm \
    npm i -g pnpm@^10.10

WORKDIR /app
COPY ./package.json /app/package.json
COPY ./pnpm-lock.yaml /app/pnpm-lock.yaml
COPY ./pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY ./typescript/packages/h402/package.json /app/typescript/packages/h402/package.json
COPY ./typescript/packages/facilitator/package.json /app/typescript/packages/facilitator/package.json 

RUN --mount=type=cache,target=/app/.pnpm-store \
    pnpm --filter '@bit-gpt/h402' i && \
    pnpm --filter facilitator i

COPY ./typescript/packages/h402 /app/typescript/packages/h402
COPY ./typescript/packages/facilitator /app/typescript/packages/facilitator
RUN pnpm --filter '@bit-gpt/h402' build && \
    pnpm --filter facilitator build
 
FROM node:22-alpine3.21 AS prod 
COPY --from=build /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/node_modules /app/node_modules

COPY --from=build /app/typescript/packages/facilitator/dist /app/typescript/packages/facilitator/dist
COPY --from=build /app/typescript/packages/facilitator/package.json /app/typescript/packages/facilitator/package.json
COPY --from=build /app/typescript/packages/facilitator/node_modules /app/typescript/packages/facilitator/node_modules

# pnpm node_modules
COPY --from=build /app/typescript/packages/h402/dist /app/typescript/packages/h402/dist
COPY --from=build /app/typescript/packages/h402/package.json /app/typescript/packages/h402/package.json
COPY --from=build /app/typescript/packages/h402/node_modules /app/typescript/packages/h402/node_modules

RUN npm i -g pnpm@^10.10

WORKDIR /app/typescript/packages/facilitator
EXPOSE 3000/tcp
ENTRYPOINT [ "node", "dist/index.js" ]