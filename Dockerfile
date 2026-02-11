FROM tusproject/tusd:latest

RUN mkdir -p /hooks
COPY hooks/ /hooks/

# Make sure hook files are executable
COPY --chmod=755 hooks/post-finish /hooks/post-finish

# Example: store uploads on disk in /data (use a Railway Volume for persistence)
# Enable hooks directory
CMD sh -c 'tusd -verbose -host=0.0.0.0 -port=$PORT -base-path=/files/ \
  -hooks-dir=/hooks \
  -s3-bucket=$B2_BUCKET -s3-endpoint=$B2_ENDPOINT -s3-object-prefix=uploads/ \
  -s3-part-size=6291456 -behind-proxy'