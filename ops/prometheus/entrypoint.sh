#!/bin/sh
set -eu
PORT="${PORT:-9090}"
exec /bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --web.listen-address="0.0.0.0:${PORT}" \
  --storage.tsdb.path=/prometheus \
  --web.enable-lifecycle
