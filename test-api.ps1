# Script para testear la API de AUREA
# Ejecutar desde aurea-api: .\test-api.ps1

$API_BASE = "http://localhost:3000/api"
$GREEN = "`e[32m"
$RED = "`e[31m"
$YELLOW = "`e[33m"
$RESET = "`e[0m"

Write-Host "`n🧪 TESTING API AUREA - Backend Migrado" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Función para hacer requests y mostrar resultados
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Description,
        [object]$Body = $null
    )
    
    Write-Host "`n📍 $Description" -ForegroundColor Yellow
    Write-Host "   $Method $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            Write-Host "   Body: $($params.Body)" -ForegroundColor Gray
        }
        
        $response = Invoke-WebRequest @params
        
        Write-Host "   ✅ Status: $($response.StatusCode)" -ForegroundColor Green
        
        if ($response.Content) {
            $json = $response.Content | ConvertFrom-Json
            if ($json -is [array]) {
                Write-Host "   📊 Resultados: $($json.Count) items" -ForegroundColor Cyan
                if ($json.Count -gt 0) {
                    Write-Host "   Primer item:" -ForegroundColor Gray
                    $json[0] | ConvertTo-Json -Depth 2 | Write-Host -ForegroundColor DarkGray
                }
            } else {
                $json | ConvertTo-Json -Depth 2 | Write-Host -ForegroundColor DarkGray
            }
        }
        
        return $true
    }
    catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        return $false
    }
}

# 1. Health Check
Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "1️⃣  HEALTH CHECK" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

Test-Endpoint -Method "GET" -Url "$API_BASE/health" -Description "Health endpoint"

# 2. Profile Tests
Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "2️⃣  CRUD: PROFILES" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

Test-Endpoint -Method "GET" -Url "$API_BASE/profiles" -Description "Listar perfiles"
Test-Endpoint -Method "GET" -Url "$API_BASE/profiles/00000000-0000-0000-0000-000000000001" -Description "Obtener perfil de prueba"

# 3. Expediente Tests
Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "3️⃣  CRUD: EXPEDIENTES" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

Test-Endpoint -Method "GET" -Url "$API_BASE/expedientes" -Description "Listar expedientes (debería estar vacío)"

Write-Host "`n📝 Crear expediente de prueba..." -ForegroundColor Yellow
$nuevoExpediente = @{
    nombre = "Expediente Test API $(Get-Date -Format 'HH:mm:ss')"
    descripcion = "Creado desde test-api.ps1"
    profileId = "00000000-0000-0000-0000-000000000001"
    estado = "borrador"
}

$created = Test-Endpoint -Method "POST" -Url "$API_BASE/expedientes" -Description "Crear expediente" -Body $nuevoExpediente

if ($created) {
    # Obtener el ID del expediente creado
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/expedientes" -Method GET
        if ($response -and $response.Count -gt 0) {
            $expedienteId = $response[0].id
            Write-Host "   📋 Expediente creado con ID: $expedienteId" -ForegroundColor Cyan
            
            Test-Endpoint -Method "GET" -Url "$API_BASE/expedientes/$expedienteId" -Description "Obtener expediente por ID"
            
            $updateData = @{
                nombre = "Expediente Actualizado $(Get-Date -Format 'HH:mm:ss')"
                descripcion = "Actualizado desde test-api.ps1"
            }
            Test-Endpoint -Method "PUT" -Url "$API_BASE/expedientes/$expedienteId" -Description "Actualizar expediente" -Body $updateData
            
            # No eliminar para que quede en la DB para pruebas
            # Test-Endpoint -Method "DELETE" -Url "$API_BASE/expedientes/$expedienteId" -Description "Eliminar expediente"
        }
    }
    catch {
        Write-Host "   ⚠️  No se pudo obtener el ID del expediente" -ForegroundColor Yellow
    }
}

# 4. AI Function Tests (si el backend está configurado)
Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "4️⃣  AI FUNCTIONS" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

Write-Host "`n⚠️  Tests de AI requieren configuración adicional" -ForegroundColor Yellow
Write-Host "   Para probar AI functions, necesitas:" -ForegroundColor Gray
Write-Host "   - Registrar las rutas en src/app.ts" -ForegroundColor Gray
Write-Host "   - Configurar ANTHROPIC_API_KEY en .env" -ForegroundColor Gray

# Test CPV Search (no requiere AI)
Write-Host "`n📍 Test CPV Search (búsqueda en base de datos)" -ForegroundColor Yellow
try {
    $cpvBody = @{
        query = "construcción"
        limit = 5
    }
    Test-Endpoint -Method "POST" -Url "$API_BASE/cpv-search" -Description "Buscar códigos CPV" -Body $cpvBody
}
catch {
    Write-Host "   ⚠️  Endpoint CPV no registrado o tabla vacía" -ForegroundColor Yellow
}

# Resumen final
Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "✅ TESTING COMPLETADO" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

Write-Host "`n📊 Endpoints testeados:" -ForegroundColor Cyan
Write-Host "   - Health check" -ForegroundColor Gray
Write-Host "   - CRUD Profiles (GET, GET/:id)" -ForegroundColor Gray
Write-Host "   - CRUD Expedientes (GET, POST, GET/:id, PUT/:id)" -ForegroundColor Gray
Write-Host "   - CPV Search (POST - opcional)" -ForegroundColor Gray

Write-Host "`n💡 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   1. Verificar que los endpoints respondan correctamente" -ForegroundColor Gray
Write-Host "   2. Revisar logs del backend para errores" -ForegroundColor Gray
Write-Host "   3. Registrar rutas AI en src/app.ts si quieres probar IA" -ForegroundColor Gray
Write-Host "   4. Usar Postman/Insomnia para tests más complejos" -ForegroundColor Gray

Write-Host "`n"
