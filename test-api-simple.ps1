# Script simple para testear API AUREA
Write-Host "`n=== TESTING API AUREA ===" -ForegroundColor Cyan

$API_BASE = "http://localhost:3000/api"

# Test 1: Ver si hay rutas públicas
Write-Host "`n1. Test rutas públicas..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_BASE/public" -Method GET
    Write-Host "   ✅ Respuesta: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Ver si hay rutas privadas
Write-Host "`n2. Test rutas privadas..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_BASE/private" -Method GET
    Write-Host "   ✅ Respuesta: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Swagger
Write-Host "`n3. Test Swagger..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/docs" -Method GET
    Write-Host "   ✅ Swagger disponible en http://localhost:3000/docs" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== TESTING COMPLETADO ===" -ForegroundColor Cyan
Write-Host "`n💡 Para testear endpoints específicos:" -ForegroundColor Yellow
Write-Host "   - Abre Swagger: http://localhost:3000/docs" -ForegroundColor Gray
Write-Host "   - O usa curl/Invoke-WebRequest para endpoints específicos" -ForegroundColor Gray
Write-Host ""
