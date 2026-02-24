# AUREA Kubernetes Deployment

Este directorio contiene toda la configuración necesaria para desplegar AUREA en Kubernetes (GobTechLab AEAD).

## Estructura

```
aurea-k8s/
├── README.md                 # Este archivo
├── docker/                   # Dockerfiles para construir imágenes
│   ├── Dockerfile.api        # Backend Fastify/Node.js
│   ├── Dockerfile.frontend   # Frontend React (Nginx)
│   └── nginx.conf            # Config Nginx para SPA
└── manifests/                # Manifiestos Kubernetes
    ├── 00-namespace.yaml     # Namespace y NetworkPolicy
    ├── 01-configmap.yaml     # Configuración pública
    ├── 02-secrets.yaml       # Secrets (template)
    ├── 03-postgres.yaml      # Base de datos
    ├── 04-redis.yaml         # Cache
    ├── 05-api-deployment.yaml    # API Backend
    ├── 06-frontend-deployment.yaml   # Frontend
    ├── 07-ingress.yaml       # Exposición externa
    └── 08-autoscaling.yaml   # Auto-escalado
```

## Requisitos Previos

1. **Cluster Kubernetes** (v1.25+)
2. **kubectl** instalado y configurado
3. **Docker** para construir imágenes
4. **Ingress Controller** (nginx-ingress)
5. **Cert-Manager** (opcional, para TLS automático)

## Construcción de Imágenes Docker

```bash
# Desde el directorio raíz de repositorios

# API
docker build -f aurea-k8s/docker/Dockerfile.api -t aurea-api:latest ../aurea-api

# Frontend
docker build -f aurea-k8s/docker/Dockerfile.frontend -t aurea-frontend:latest ../aurea-1mb
```

## Despliegue Paso a Paso

### 1. Crear namespace y políticas de red
```bash
kubectl apply -f manifests/00-namespace.yaml
```

### 2. Configurar secrets (⚠️ IMPORTANTE)
Editar `manifests/02-secrets.yaml` con valores reales o usar Vault:
```bash
# Opción A: Editar manualmente (solo desarrollo)
kubectl apply -f manifests/02-secrets.yaml

# Opción B: Usar External Secrets Operator (producción)
# Configurar según documentación de AEAD
```

### 3. Aplicar ConfigMaps
```bash
kubectl apply -f manifests/01-configmap.yaml
```

### 4. Desplegar infraestructura
```bash
kubectl apply -f manifests/03-postgres.yaml
kubectl apply -f manifests/04-redis.yaml

# Esperar a que estén ready
kubectl -n aurea wait --for=condition=ready pod -l app=postgres --timeout=120s
kubectl -n aurea wait --for=condition=ready pod -l app=redis --timeout=60s
```

### 5. Ejecutar migraciones de base de datos
```bash
# Crear job para migraciones
kubectl -n aurea run prisma-migrate --rm -it --restart=Never \
  --image=registry.aead.gob.es/aurea/api:latest \
  --env-from=secret/aurea-secrets \
  -- npx prisma migrate deploy
```

### 6. Desplegar aplicación
```bash
kubectl apply -f manifests/05-api-deployment.yaml
kubectl apply -f manifests/06-frontend-deployment.yaml
```

### 7. Configurar ingress
```bash
kubectl apply -f manifests/07-ingress.yaml
```

### 8. Habilitar auto-scaling
```bash
kubectl apply -f manifests/08-autoscaling.yaml
```

## Verificación

```bash
# Ver todos los recursos
kubectl -n aurea get all

# Ver logs de la API
kubectl -n aurea logs -l app=aurea-api -f

# Ver estado de los pods
kubectl -n aurea get pods -w

# Probar SSO
curl -I https://aurea.guardia-civil.es/api/public/sso/status
```

## Pruebas Locales con Minikube

```bash
# Iniciar minikube
minikube start --driver=docker --memory=4096 --cpus=2

# Habilitar ingress
minikube addons enable ingress

# Agregar hostname a /etc/hosts (o C:\Windows\System32\drivers\etc\hosts)
echo "$(minikube ip) aurea.local" | sudo tee -a /etc/hosts

# Desplegar
kubectl apply -f k8s/

# Acceder
open http://aurea.local
```

## Monitorización

Los manifiestos incluyen:
- **Prometheus annotations** en los deployments
- **Health checks** (liveness/readiness probes)
- **Resource limits** para evitar resource starvation

Para monitorización completa, integrar con:
- Prometheus + Grafana
- ELK Stack para logs
- Jaeger para tracing distribuido

## Seguridad ENS Alto

- ✅ NetworkPolicy restrictiva
- ✅ Pods ejecutan como non-root
- ✅ ReadOnlyRootFilesystem
- ✅ Capabilities dropped
- ✅ TLS obligatorio vía ingress
- ✅ Rate limiting en ingress
- ✅ Security headers configurados

## Integración SSO/OIDC

Para configurar SSO con OpenAM de AEAD:

1. Obtener credenciales de cliente del equipo AEAD
2. Actualizar `aurea-secrets`:
   - `OIDC_CLIENT_ID`
   - `OIDC_CLIENT_SECRET`
3. Verificar `aurea-config`:
   - `OIDC_ISSUER_URL` debe apuntar a OpenAM de producción
   - `OIDC_REDIRECT_URI` debe coincidir con el configurado en OpenAM
