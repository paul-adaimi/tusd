FROM tusproject/tusd:latest

USER root

# Install node (and npm) into the image
RUN apk add --no-cache nodejs npm

RUN mkdir -p /hooks
COPY --chmod=755 hooks/post-finish /hooks/post-finish
COPY hooks/post-finish.mjs /hooks/post-finish.mjs

COPY --chmod=755 start.sh /start.sh
ENTRYPOINT ["/start.sh"]
