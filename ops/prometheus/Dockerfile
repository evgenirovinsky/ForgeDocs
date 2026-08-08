FROM prom/prometheus:v2.54.1

COPY prometheus.yml /etc/prometheus/prometheus.yml
COPY entrypoint.sh /entrypoint.sh

# Official image runs as nobody; entrypoint must stay executable for that user.
USER root
RUN chmod +x /entrypoint.sh && chown nobody:nobody /entrypoint.sh
USER nobody

ENTRYPOINT ["/entrypoint.sh"]
