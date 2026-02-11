FROM node:20-alpine AS hookdeps
WORKDIR /app
RUN npm init -y && npm i @aws-sdk/client-s3

FROM tusproject/tusd:latest

USER root
RUN mkdir -p /hooks /hooks/node_modules
COPY --from=hookdeps /app/node_modules /hooks/node_modules

COPY --chmod=755 hooks/post-finish /hooks/post-finish
COPY hooks/post-finish.mjs /hooks/post-finish.mjs
COPY --chmod=755 start.sh /start.sh

ENTRYPOINT ["/start.sh"]
