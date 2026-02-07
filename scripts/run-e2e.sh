#!/usr/bin/env bash
set -euo pipefail

COMPOSE="docker compose -f docker-compose.e2e.yml"

cleanup() {
  $COMPOSE down -v 2>/dev/null
}
trap cleanup EXIT

# Build everything first
$COMPOSE build

# Start infrastructure + app (background, wait for healthy)
$COMPOSE up -d namenode datanode hdfs-app

# Run seed (foreground, blocks until done)
$COMPOSE up seed

# Run playwright tests
# Use docker compose up so it joins the project network properly
$COMPOSE up --exit-code-from playwright playwright
