#!/bin/sh
set -eu
# Railway injects PORT; Grafana listens on GF_SERVER_HTTP_PORT.
export GF_SERVER_HTTP_PORT="${PORT:-3000}"
export PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus.railway.internal:8080}"
exec /run.sh
