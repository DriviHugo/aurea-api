# 🧪 Automated Endpoint Testing

Sistema de testing automático para validar todos los endpoints generados por migration-boilerplate.

## 📋 Características

- ✅ **Testing automático** de todos los endpoints CRUD generados
- ⚡ **Tiempo de respuesta** medido para cada endpoint
- 🎨 **Output colorido** con resumen detallado
- 🔐 **Soporte para autenticación** (con y sin JWT tokens)
- 📊 **Reportes completos** con estadísticas de éxito/fallo
- 🚀 **Ejecución rápida** (promedio 4ms por endpoint)

## 🚀 Uso Rápido

### Testing sin autenticación (espera 401)

```bash
npm run test:endpoints
```

Valida que todas las rutas están protegidas y devuelven `401 Unauthorized` sin token.

### Testing con autenticación (espera 200/404)

```bash
npm run test:endpoints:auth
```

⚠️ **Nota:** Esto esperará `200 OK` pero fallará sin un token válido. Usa el siguiente comando con un token real.

### Testing con JWT token real

```bash
npx tsx test-endpoints.ts --token=eyJhbGciOiJIUzI1NiIs...
```

## 📊 Output de Ejemplo

```
================================================================================
🚀 AUTOMATED ENDPOINT TESTING
Testing all generated CRUD routes from migration-boilerplate
Mode: without authentication
================================================================================

🔍 Checking server health...
✅ Server is running

🧪 Testing 22 endpoints...

[ 1/22] Testing /api/private/profile... ✓ 401 (8ms)
[ 2/22] Testing /api/private/user-role... ✓ 401 (4ms)
[ 3/22] Testing /api/private/expediente... ✓ 401 (3ms)
...
[22/22] Testing /api/private/ai-function-log... ✓ 401 (3ms)

================================================================================
📊 TEST SUMMARY
================================================================================

Total Tests: 22
Passed:      22 (100.0%)
Failed:      0 (0.0%)

✅ PASSING ENDPOINTS (22)
────────────────────────────────────────────────────────────────────────────────
✓ GET    /api/private/profile                          → 401 (8ms)
✓ GET    /api/private/user-role                        → 401 (4ms)
...

⚡ Average Response Time: 4ms

================================================================================

🎉 All tests passed! Migration successful!
```

## 🧩 Endpoints Probados

El script prueba automáticamente **todos los endpoints generados**:

- `/api/private/profile`
- `/api/private/user-role`
- `/api/private/expediente`
- `/api/private/alternativa-procedimiento`
- `/api/private/cpv-codigo`
- `/api/private/cpv-recomendado`
- `/api/private/evidencia`
- `/api/private/regla`
- `/api/private/documento`
- `/api/private/documento-seccion`
- `/api/private/documento-generacion`
- `/api/private/documento-version`
- `/api/private/documento-evidencia`
- `/api/private/validacion`
- `/api/private/validacion-evidencia`
- `/api/private/revision`
- `/api/private/comentario`
- `/api/private/audit-log`
- `/api/private/ai-provider`
- `/api/private/ai-function`
- `/api/private/ai-function-version`
- `/api/private/ai-function-log`

## 🔧 Personalización

### Agregar más tests

Edita `test-endpoints.ts` y agrega rutas al array `GENERATED_ROUTES`:

```typescript
const GENERATED_ROUTES = [
  "/api/private/profile",
  "/api/private/tu-nueva-ruta",
  // ...
];
```

### Cambiar timeout

```typescript
const TIMEOUT_MS = 5000; // Ajusta según necesidad
```

### Probar diferentes métodos HTTP

```typescript
const result = await testEndpoint(route, "POST", 201, options);
```

## 🎯 Casos de Uso

### 1. Validar migración

Después de ejecutar `npm run migrate:all:simple`:

```bash
npm run test:endpoints
```

Debe mostrar **100% passed** para confirmar que todos los endpoints fueron generados correctamente.

### 2. CI/CD Integration

Agrega al pipeline:

```yaml
- name: Test API Endpoints
  run: |
    npm run dev &
    sleep 5
    npm run test:endpoints
```

### 3. Debugging

Si un endpoint falla, el script muestra:
- Status code esperado vs recibido
- Mensaje de error
- Tiempo de respuesta

```
❌ FAILING ENDPOINTS (1)
────────────────────────────────────────────────────────────────────────────────
✗ GET    /api/private/profile
  Expected: 401 | Got: 500
  Error: Internal Server Error

```

## 📝 Notas

- **Servidor debe estar corriendo**: El script verifica que el servidor esté activo antes de ejecutar tests
- **Tests paralelos**: Los tests se ejecutan secuencialmente (no en paralelo) para precisión en tiempos de respuesta
- **Exit codes**: El script retorna `0` si todos pasan, `1` si alguno falla (útil para CI/CD)

## 🚀 Próximas Mejoras

- [ ] Tests para POST/PUT/DELETE con payloads
- [ ] Validación de response schemas
- [ ] Tests de performance (load testing)
- [ ] Generación de reportes HTML
- [ ] Integration con Jest/Vitest
