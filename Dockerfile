FROM tusproject/tusd:latest

# Copy hooks into the image
COPY hooks/ /hooks/

# Make sure hook files are executable
COPY --chmod=755 hooks/post-finish /hooks/post-finish

# Example: store uploads on disk in /data (use a Railway Volume for persistence)
# Enable hooks directory
CMD ["tusd", "-port=1080", "-dir=/data", "-hooks-dir=/hooks"]
