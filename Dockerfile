FROM node:22-alpine AS hookbuild
WORKDIR /app
RUN npm init -y >/dev/null 2>&1
RUN npm i @aws-sdk/client-s3 esbuild
COPY hooks/post-finish.mjs /app/post-finish.mjs
RUN npx esbuild /app/post-finish.mjs --bundle --platform=node --format=esm --outfile=/app/post-finish.mjs

FROM tusproject/tusd:latest

USER root
# Install node if you did that already; keep it
RUN apk add --no-cache nodejs

RUN mkdir -p /hooks
COPY --chmod=755 hooks/post-finish /hooks/post-finish
COPY --from=hookbuild /app/post-finish.mjs /hooks/post-finish.mjs

COPY --chmod=755 start.sh /start.sh
ENTRYPOINT ["/start.sh"]
