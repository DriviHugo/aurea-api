/**
 * Setup Docker Compose - Regular Script (No AI)
 * Configures Docker services for on-premise deployment
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export interface DockerSetupOptions {
  includeKeycloak?: boolean;
  includeMinio?: boolean;
  includePrometheus?: boolean;
  includeMailpit?: boolean;
}

export async function setupDocker(
  options: DockerSetupOptions = {},
): Promise<void> {
  const {
    includeKeycloak = true,
    includeMinio = true,
    includePrometheus = false,
    includeMailpit = true,
  } = options;

  console.log("🐳 Setting up Docker Compose...");

  const dockerDir = path.join(process.cwd(), "docker");
  if (!fs.existsSync(dockerDir)) {
    fs.mkdirSync(dockerDir, { recursive: true });
  }

  // Generate docker-compose.yml
  const services: string[] = [
    `# Docker Compose - AUREA On-Premise Stack
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: aurea-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: aurea
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: aurea-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5`,
  ];

  if (includeMinio) {
    services.push(`
  minio:
    image: minio/minio:latest
    container_name: aurea-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3`);
  }

  if (includeMailpit) {
    services.push(`
  mailpit:
    image: axllent/mailpit:latest
    container_name: aurea-mailpit
    ports:
      - "1025:1025"
      - "8025:8025"
    environment:
      MP_SMTP_AUTH_ACCEPT_ANY: 1
      MP_SMTP_AUTH_ALLOW_INSECURE: 1`);
  }

  if (includeKeycloak) {
    services.push(`
  keycloak:
    image: quay.io/keycloak/keycloak:23.0
    container_name: aurea-keycloak
    command: start-dev
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: postgres
      KC_DB_PASSWORD: postgres
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy`);
  }

  if (includePrometheus) {
    services.push(`
  prometheus:
    image: prom/prometheus:latest
    container_name: aurea-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana:latest
    container_name: aurea-grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus`);
  }

  // Add volumes
  const volumes = `
volumes:
  postgres_data:
  redis_data:${includeMinio ? "\n  minio_data:" : ""}${includePrometheus ? "\n  prometheus_data:\n  grafana_data:" : ""}
`;

  const dockerCompose = services.join("\n") + volumes;

  const composePath = path.join(dockerDir, "docker-compose.yml");
  fs.writeFileSync(composePath, dockerCompose, "utf-8");

  console.log(`✅ Docker Compose created: ${composePath}`);

  // Create Prometheus config if needed
  if (includePrometheus) {
    const prometheusConfig = `global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'aurea-api'
    static_configs:
      - targets: ['host.docker.internal:3000']
`;
    fs.writeFileSync(
      path.join(dockerDir, "prometheus.yml"),
      prometheusConfig,
      "utf-8",
    );
    console.log("✅ Prometheus config created");
  }

  // Create .dockerignore
  const dockerignore = `node_modules
dist
.env
.git
*.log
coverage
.vscode
`;
  fs.writeFileSync(
    path.join(process.cwd(), ".dockerignore"),
    dockerignore,
    "utf-8",
  );

  console.log("\n🚀 To start services:");
  console.log("  cd docker && docker-compose up -d\n");
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options: DockerSetupOptions = {
    includeKeycloak: !args.includes("--no-keycloak"),
    includeMinio: !args.includes("--no-minio"),
    includePrometheus: args.includes("--prometheus"),
    includeMailpit: !args.includes("--no-mailpit"),
  };

  setupDocker(options).catch((error) => {
    console.error("❌ Docker setup error:", error.message);
    process.exit(1);
  });
}
