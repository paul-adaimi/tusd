FROM node:22-alpine AS hookbuild
WORKDIR /app
RUN npm init -y >/dev/null 2>&1
RUN npm i @aws-sdk/client-s3 esbuild
COPY hooks/post-finish-src.mjs /app/post-finish-src.mjs

# ✅ bundle to CommonJS (avoids "dynamic require of buffer")
RUN npx esbuild /app/post-finish-src.mjs \
  --bundle \
  --platform=node \
  --format=cjs \
  --target=node22 \
  --outfile=/app/post-finish.cjs

FROM tusproject/tusd:latest

USER root
# install node runtime so tusd can run the hook
RUN apk add --no-cache nodejs

RUN mkdir -p /hooks
COPY --chmod=755 hooks/post-finish /hooks/post-finish
COPY --from=hookbuild /app/post-finish.cjs /hooks/post-finish.cjs

# No esbuild bundling needed here — post-receive-src.mjs has no external
# npm dependencies (just Node's built-in fetch/AbortSignal), unlike
# post-finish which needs @aws-sdk/client-s3 bundled to CJS.
COPY --chmod=755 hooks/post-receive /hooks/post-receive
COPY --chmod=755 hooks/post-receive-src.mjs /hooks/post-receive-src.mjs

COPY --chmod=755 start.sh /start.sh
ENTRYPOINT ["/start.sh"]
