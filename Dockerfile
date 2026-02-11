FROM tusproject/tusd:latest

# Copy hooks into the image
COPY hooks/ /hooks/

# Make sure hook files are executable
RUN chmod +x /hooks/*

# Example: store uploads on disk in /data (use a Railway Volume for persistence)
# Enable hooks directory
CMD ["tusd", "-port=1080", "-dir=/data", "-hooks-dir=/hooks"]
