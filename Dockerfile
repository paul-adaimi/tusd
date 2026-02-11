FROM tusproject/tusd:latest

# Create hooks dir as root
USER root
RUN mkdir -p /hooks

# Copy hook and set permissions in ONE step (no need for two COPYs)
COPY --chmod=755 hooks/post-finish /hooks/post-finish

# (Optional but cleaner: you can switch back to non-root if you want)
# USER 1000

CMD sh -c 'tusd -verbose -host=0.0.0.0 -port=$PORT -base-path=/files/ \
  -hooks-dir=/hooks \
  -s3-bucket=$B2_BUCKET -s3-endpoint=$B2_ENDPOINT -s3-object-prefix=uploads/ \
  -s3-part-size=6291456 -behind-proxy'
