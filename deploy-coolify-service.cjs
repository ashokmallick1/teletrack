const fs = require('fs');

async function main() {
  const compose = `services:
  teletrack-evolution-db:
    image: 'postgres:15-alpine'
    container_name: teletrack-evolution-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=evolution
      - POSTGRES_PASSWORD=evolution_secret_pass
      - POSTGRES_DB=evolution_db
    volumes:
      - teletrack_evolution_db_data:/var/lib/postgresql/data

  teletrack-evolution-api:
    image: 'evoapicloud/evolution-api:latest'
    container_name: teletrack-evolution-api
    restart: unless-stopped
    depends_on:
      - teletrack-evolution-db
    ports:
      - '8085:8080'
    environment:
      - SERVER_URL=http://localhost:8085
      - SERVER_PORT=8080
      - AUTHENTICATION_API_KEY=teletrack_evolution_secret_key_2026
      - DATABASE_PROVIDER=postgresql
      - DATABASE_URL=postgresql://evolution:evolution_secret_pass@teletrack-evolution-db:5432/evolution_db?schema=public
      - DATABASE_CONNECTION_URI=postgresql://evolution:evolution_secret_pass@teletrack-evolution-db:5432/evolution_db?schema=public
      - DATABASE_CLIENT_NAME=evolution_whatsapp
      - CACHE_REDIS_ENABLED=false
      - RABBITMQ_ENABLED=false
      - SQS_ENABLED=false
      - WEBHOOK_GLOBAL_ENABLED=true
      - WEBHOOK_GLOBAL_URL=http://teletrack-api:4000/api/v1/whatsapp/evolution/webhook
      - WEBHOOK_EVENTS_MESSAGES_UPSERT=true
      - WEBHOOK_EVENTS_MESSAGES_UPDATE=true
      - WEBHOOK_EVENTS_CONNECTION_UPDATE=true

  teletrack-api:
    image: 'teletrack-api:latest'
    container_name: teletrack-api
    restart: unless-stopped
    depends_on:
      - teletrack-evolution-api
    ports:
      - '4100:4000'
    environment:
      - NODE_ENV=production
      - PORT=4000
      - EVOLUTION_API_URL=http://teletrack-evolution-api:8080
      - EVOLUTION_API_KEY=teletrack_evolution_secret_key_2026
      - EVOLUTION_INSTANCE_NAME=teletrack-sales-bot
    volumes:
      - /home/ubuntu/teletrack-data:/app/services/api/data
      - /home/ubuntu/teletrack-uploads:/app/services/api/uploads

  teletrack-web:
    image: 'teletrack-web:latest'
    container_name: teletrack-web
    restart: unless-stopped
    depends_on:
      - teletrack-api
    ports:
      - '3180:80'

  teletrack-tunnel:
    image: 'cloudflare/cloudflared:latest'
    container_name: teletrack-tunnel
    restart: unless-stopped
    command: tunnel --url http://teletrack-web:80 --no-autoupdate
    depends_on:
      - teletrack-web

volumes:
  teletrack_evolution_db_data:
    external: true
`;

  const payload = {
    project_uuid: 'se6yehiekf0ua0dabmzrm075',
    environment_name: 'production',
    server_uuid: '4rtzaoervomu6lxhys14yu1d',
    destination_uuid: 'ji7ym863ucthnmtrv04fsjab',
    name: 'teletrack-platform',
    description: 'TeleTrack Call Analytics & Evolution WhatsApp Gateway with Cloudflared',
    docker_compose_raw: Buffer.from(compose).toString('base64'),
    instant_deploy: true
  };

  console.log('Sending Service creation request to Coolify API...');
  const res = await fetch('https://ashokmallickone.bhashaai.in/api/v1/services', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer 1|PgckSS43LyNPjaRzeTVbL6JbWx8XfstSXsGFIXRxa83508ba',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  console.log('HTTP Status:', res.status);
  const data = await res.json();
  console.log('Coolify Response:', JSON.stringify(data, null, 2));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
