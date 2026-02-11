#!/usr/bin/env sh
set -e

echo "PORT=$PORT"
echo "B2_BUCKET=$B2_BUCKET"
echo "B2_ENDPOINT=$B2_ENDPOINT"

exec tusd \
  -verbose \
  -host=0.0.0.0 \
  -port="${PORT:-8080}" \
  -base-path=/files/ \
  -hooks-dir=/hooks \
  -s3-bucket="$B2_BUCKET" \
  -s3-endpoint="$B2_ENDPOINT" \
  -s3-object-prefix=uploads/ \
  -s3-part-size=6291456 \
  -behind-proxy
