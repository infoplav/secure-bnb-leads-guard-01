FROM debian:bullseye-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    asterisk \
    asterisk-modules \
    asterisk-config \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create directories
RUN mkdir -p /etc/asterisk/certs
RUN mkdir -p /var/log/asterisk
RUN mkdir -p /var/lib/asterisk
RUN mkdir -p /var/spool/asterisk

# Generate self-signed certificates for DTLS/WSS
RUN openssl req -new -x509 -days 365 -nodes \
    -out /etc/asterisk/certs/asterisk.crt \
    -keyout /etc/asterisk/certs/asterisk.key \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=asterisk"

# Copy configuration files
COPY asterisk-config/ /etc/asterisk/

# Set proper ownership
RUN chown -R asterisk:asterisk /etc/asterisk
RUN chown -R asterisk:asterisk /var/log/asterisk
RUN chown -R asterisk:asterisk /var/lib/asterisk
RUN chown -R asterisk:asterisk /var/spool/asterisk

# Expose ports
EXPOSE 5060/udp 5060/tcp 8088/tcp 8089/tcp 10000-20000/udp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD asterisk -rx "core show version" || exit 1

# Run asterisk
USER asterisk
CMD ["asterisk", "-f", "-vvv"]