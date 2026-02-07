#!/usr/bin/env sh
set -eu

WEBHDFS="http://namenode:9870/webhdfs/v1"
USER="user.name=hadoop"

echo "Waiting for HDFS namenode..."
for i in $(seq 1 60); do
  if curl -sf "${WEBHDFS}/?op=LISTSTATUS&${USER}" > /dev/null 2>&1; then
    echo "Namenode is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Timed out waiting for namenode."
    exit 1
  fi
  sleep 2
done

echo "Waiting for datanode..."
for i in $(seq 1 60); do
  LIVE=$(curl -sf "http://namenode:9870/jmx?qry=Hadoop:service=NameNode,name=FSNamesystemState" \
    | sed -n 's/.*"NumLiveDataNodes"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' || echo "0")
  if [ "$LIVE" -ge 1 ]; then
    echo "Datanode is live."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Timed out waiting for datanode."
    exit 1
  fi
  sleep 2
done

echo "Waiting for app to be healthy..."
for i in $(seq 1 60); do
  if curl -sf "http://hdfs-app:3001/api/health" > /dev/null 2>&1; then
    echo "App is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Timed out waiting for app."
    exit 1
  fi
  sleep 2
done

upload_file() {
  local path="$1"
  shift
  # Remaining args are content (allows binary via stdin)

  # Step 1: Create (get redirect location)
  local location
  location=$(curl -sf -X PUT \
    -w '%{redirect_url}' \
    -o /dev/null \
    "${WEBHDFS}${path}?op=CREATE&overwrite=true&${USER}")

  if [ -z "$location" ]; then
    echo "  WARN: no redirect for ${path}, skipping"
    return
  fi

  # Replace localhost with datanode hostname in redirect URL
  location=$(echo "$location" | sed 's/localhost/datanode/g; s/0\.0\.0\.0/datanode/g')

  # Step 2: Write data to datanode
  curl -sf -X PUT \
    -H "Content-Type: application/octet-stream" \
    --data-binary "$@" \
    "$location" > /dev/null

  echo "  ${path}"
}

echo ""
echo "Creating test directories..."
curl -sf -X PUT "${WEBHDFS}/data?op=MKDIRS&${USER}" > /dev/null
curl -sf -X PUT "${WEBHDFS}/data/logs?op=MKDIRS&${USER}" > /dev/null
curl -sf -X PUT "${WEBHDFS}/data/reports?op=MKDIRS&${USER}" > /dev/null
curl -sf -X PUT "${WEBHDFS}/data/config?op=MKDIRS&${USER}" > /dev/null
curl -sf -X PUT "${WEBHDFS}/projects?op=MKDIRS&${USER}" > /dev/null
curl -sf -X PUT "${WEBHDFS}/projects/analytics?op=MKDIRS&${USER}" > /dev/null
curl -sf -X PUT "${WEBHDFS}/data/empty-dir?op=MKDIRS&${USER}" > /dev/null

echo "Uploading test files..."

upload_file "/data/readme.txt" "Welcome to the HDFS Browser test cluster.

This is sample data for testing the HDFS Browser application.
Feel free to browse around, upload files, and create directories."

upload_file "/data/logs/app-2025-01-15.log" "2025-01-15 08:00:01 INFO  Application started
2025-01-15 08:00:02 INFO  Connected to database
2025-01-15 08:15:33 WARN  Slow query detected (1523ms)
2025-01-15 09:22:10 INFO  Processing batch job #4521
2025-01-15 09:22:45 INFO  Batch job #4521 completed (35s)
2025-01-15 10:00:00 INFO  Health check passed
2025-01-15 11:30:22 ERROR Connection timeout to upstream service
2025-01-15 11:30:25 INFO  Retry successful"

upload_file "/data/logs/app-2025-01-16.log" "2025-01-16 08:00:01 INFO  Application started
2025-01-16 08:00:03 INFO  Connected to database
2025-01-16 12:45:00 INFO  Processing batch job #4522
2025-01-16 12:46:12 INFO  Batch job #4522 completed (72s)
2025-01-16 18:00:00 INFO  Daily cleanup completed"

upload_file "/data/config/settings.json" '{
  "app": {
    "name": "data-pipeline",
    "version": "2.1.0",
    "environment": "production"
  },
  "database": {
    "host": "db.example.com",
    "port": 5432,
    "pool_size": 20
  },
  "logging": {
    "level": "INFO",
    "format": "json"
  }
}'

upload_file "/data/reports/summary.csv" "date,users,events,errors,latency_p99
2025-01-10,15234,892341,23,145
2025-01-11,15567,901245,18,132
2025-01-12,14892,867123,31,178
2025-01-13,15801,923456,12,128
2025-01-14,16023,945678,15,135
2025-01-15,15678,912345,27,156
2025-01-16,16234,956789,9,121"

upload_file "/projects/analytics/query.sql" "SELECT
    date_trunc('day', e.timestamp) AS day,
    COUNT(DISTINCT e.user_id) AS active_users,
    COUNT(*) AS total_events,
    AVG(e.latency_ms) AS avg_latency
FROM events e
WHERE e.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;"

# Create a binary file (PNG-like header with null bytes to trigger binary detection)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x02\x00\x00\x00\x90\x91h6' > /tmp/test-binary.bin
# Step 1: Create
LOCATION=$(curl -sf -X PUT \
  -w '%{redirect_url}' \
  -o /dev/null \
  "${WEBHDFS}/data/test-binary.bin?op=CREATE&overwrite=true&${USER}")
LOCATION=$(echo "$LOCATION" | sed 's/localhost/datanode/g; s/0\.0\.0\.0/datanode/g')
# Step 2: Upload
curl -sf -X PUT \
  -H "Content-Type: application/octet-stream" \
  --data-binary @/tmp/test-binary.bin \
  "$LOCATION" > /dev/null
echo "  /data/test-binary.bin"

echo ""
echo "Seed complete!"
