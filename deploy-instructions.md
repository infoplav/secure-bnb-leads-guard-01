# WebRTC-to-SIP Gateway Deployment Instructions

## Quick Start

1. **Clone/Upload Files to Your VPS:**
   ```bash
   # Upload all files to your server
   scp -r asterisk-config/ docker-compose.yml Dockerfile user@your-server:/opt/webrtc-gateway/
   ```

2. **Build and Run:**
   ```bash
   cd /opt/webrtc-gateway
   docker-compose up -d
   ```

3. **Test Connection:**
   ```bash
   # Check if Asterisk is running
   docker logs webrtc-sip-gateway
   
   # Test SIP registration
   docker exec webrtc-sip-gateway asterisk -rx "pjsip show registrations"
   ```

## Deployment Options

### Option 1: Railway.app
1. Connect your GitHub repo to Railway
2. Add environment variables:
   ```
   PORT=8089
   ```
3. Deploy - Railway will build the Docker image automatically

### Option 2: DigitalOcean Droplet
1. Create Ubuntu 22.04 droplet (minimum 1GB RAM)
2. Install Docker:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```
3. Upload files and run docker-compose

### Option 3: AWS EC2
1. Launch EC2 instance (t3.micro or larger)
2. Security Group: Open ports 5060, 8089, 10000-20000
3. Install Docker and deploy

### Option 4: Google Cloud Run
```bash
# Build and push to Container Registry
docker build -t gcr.io/YOUR-PROJECT/webrtc-gateway .
docker push gcr.io/YOUR-PROJECT/webrtc-gateway

# Deploy to Cloud Run
gcloud run deploy webrtc-gateway \
  --image gcr.io/YOUR-PROJECT/webrtc-gateway \
  --port 8089 \
  --allow-unauthenticated
```

## SSL Certificate Setup (Production)

### Using Let's Encrypt with Nginx Proxy:
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Update docker-compose.yml to mount real certificates:
volumes:
  - /etc/letsencrypt/live/your-domain.com/fullchain.pem:/etc/asterisk/certs/asterisk.crt:ro
  - /etc/letsencrypt/live/your-domain.com/privkey.pem:/etc/asterisk/certs/asterisk.key:ro
```

## Testing Your Gateway

### 1. Check Asterisk Status:
```bash
docker exec webrtc-sip-gateway asterisk -rx "core show version"
docker exec webrtc-sip-gateway asterisk -rx "pjsip show endpoints"
docker exec webrtc-sip-gateway asterisk -rx "pjsip show registrations"
```

### 2. Test WebSocket Connection:
```javascript
// In browser console
const ws = new WebSocket('wss://your-domain.com:8089/ws');
ws.onopen = () => console.log('WebSocket connected!');
ws.onerror = (e) => console.error('WebSocket error:', e);
```

### 3. Test SIP Registration from Browser:
```javascript
const userAgent = new SIP.UserAgent({
  uri: 'sip:8203@your-domain.com',
  authorizationUsername: '8203',
  authorizationPassword: 'trips',
  transportOptions: {
    server: 'wss://your-domain.com:8089/ws'
  }
});

userAgent.start();
```

## Troubleshooting

### Common Issues:

1. **Registration Failing:**
   - Check if ports 5060 and 10000-20000 are open on your firewall
   - Verify credentials in `pjsip.conf`
   - Check Asterisk logs: `docker logs webrtc-sip-gateway`

2. **WebSocket Connection Failed:**
   - Ensure port 8089 is accessible
   - Check SSL certificate validity
   - Test with `ws://` instead of `wss://` for debugging

3. **No Audio/RTP Issues:**
   - Open UDP ports 10000-20000 on your firewall
   - Check if STUN server is reachable
   - Verify NAT configuration

### Monitoring Commands:
```bash
# Real-time logs
docker logs -f webrtc-sip-gateway

# Check registrations
docker exec webrtc-sip-gateway asterisk -rx "pjsip show registrations"

# Check active calls
docker exec webrtc-sip-gateway asterisk -rx "core show channels"

# Check RTP stats
docker exec webrtc-sip-gateway asterisk -rx "rtp show stats"
```

## Production Considerations

1. **Security:**
   - Use strong passwords for SIP accounts
   - Implement fail2ban for SIP brute force protection
   - Use proper SSL certificates

2. **Scaling:**
   - Use a load balancer for multiple Asterisk instances
   - Consider Redis for session persistence
   - Monitor resource usage

3. **Monitoring:**
   - Set up log aggregation (ELK stack)
   - Monitor SIP registration health
   - Track call quality metrics

## Domain Setup

Point your domain's A record to your server's IP:
```
Type: A
Name: sip (or webrtc)
Value: YOUR_SERVER_IP
TTL: 300
```

Your WebSocket URL will be: `wss://sip.yourdomain.com:8089/ws`