FROM tusproject/tusd:latest

USER root
RUN mkdir -p /hooks

COPY --chmod=755 hooks/post-finish /hooks/post-finish
COPY --chmod=755 start.sh /start.sh

ENTRYPOINT ["/start.sh"]
