FROM grafana/grafana:11.2.2

USER root
COPY provisioning /etc/grafana/provisioning
COPY dashboards /etc/grafana/dashboards
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && chown -R grafana:root /etc/grafana/provisioning /etc/grafana/dashboards /entrypoint.sh

USER grafana

ENV GF_PATHS_PROVISIONING=/etc/grafana/provisioning
ENV GF_USERS_ALLOW_SIGN_UP=false
ENV GF_AUTH_ANONYMOUS_ENABLED=false
ENV GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/etc/grafana/dashboards/forgedocs.json
ENV PROMETHEUS_URL=http://prometheus.railway.internal:8080

ENTRYPOINT ["/entrypoint.sh"]
