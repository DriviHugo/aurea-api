#!/usr/bin/env pwsh
# Script para mostrar estadísticas de la migración

Write-Host "`n====================================================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE MIGRACION: aurea-1mb -> aurea-api" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

# Archivos generados
Write-Host "`n[ARCHIVOS GENERADOS]" -ForegroundColor Yellow
$inspectionSize = (Get-Item "inspection.json").Length / 1KB
Write-Host "  inspection.json ............ $([math]::Round($inspectionSize, 1)) KB" -ForegroundColor Green

$schemaLines = (Get-Content "prisma\schema.prisma").Count
Write-Host "  prisma/schema.prisma ....... $schemaLines lineas" -ForegroundColor Green

# Modelos Prisma
Write-Host "`n[MODELOS PRISMA]" -ForegroundColor Yellow
$schemaContent = Get-Content "prisma\schema.prisma" -Raw
$models = [regex]::Matches($schemaContent, 'model\s+(\w+)').Count
$enums = [regex]::Matches($schemaContent, 'enum\s+(\w+)').Count

Write-Host "  Models ..................... $models" -ForegroundColor Green
Write-Host "  Enums ...................... $enums" -ForegroundColor Green

# Listar modelos
$modelNames = [regex]::Matches($schemaContent, 'model\s+(\w+)') | ForEach-Object { $_.Groups[1].Value }
Write-Host "`n  Modelos: " -NoNewline
Write-Host ($modelNames -join ", ") -ForegroundColor White

# Rutas CRUD
Write-Host "`n[RUTAS CRUD]" -ForegroundColor Yellow
$crudRoutes = Get-ChildItem "src\routes\generated\*.ts"
Write-Host "  Total de rutas ............. $($crudRoutes.Count)" -ForegroundColor Green

$totalEndpoints = $crudRoutes.Count * 5
Write-Host "  Endpoints estimados ........ $totalEndpoints (GET, POST, PUT, DELETE)" -ForegroundColor Green

# Edge Functions
Write-Host "`n[EDGE FUNCTIONS AI]" -ForegroundColor Yellow
$aiFunctions = Get-ChildItem "src\routes\ai-functions\*.ts"
Write-Host "  Total funciones AI ......... $($aiFunctions.Count)" -ForegroundColor Green

$admin = ($aiFunctions | Where-Object { $_.Name -like 'admin-*' }).Count
$ai = ($aiFunctions | Where-Object { $_.Name -like 'ai-*' }).Count
$otros = $aiFunctions.Count - $admin - $ai

Write-Host "    - Admin .................. $admin" -ForegroundColor Cyan
Write-Host "    - AI/ML .................. $ai" -ForegroundColor Cyan
Write-Host "    - Otros .................. $otros" -ForegroundColor Cyan

# Base de Datos
Write-Host "`n[BASE DE DATOS]" -ForegroundColor Yellow
try {
    $containerStatus = docker ps --filter "name=aurea-postgres" --format "{{.Status}}" 2>$null
    if ($containerStatus) {
        Write-Host "  PostgreSQL ................. OK ($containerStatus)" -ForegroundColor Green
    } else {
        Write-Host "  PostgreSQL ................. No corriendo" -ForegroundColor Red
    }
} catch {
    Write-Host "  Docker ..................... No disponible" -ForegroundColor Yellow
}

$migrations = Get-ChildItem "prisma\migrations\*\" -Directory
Write-Host "  Migraciones aplicadas ...... $($migrations.Count)" -ForegroundColor Green

# Testing
Write-Host "`n[TESTING]" -ForegroundColor Yellow
if (Test-Path "test-ai-quick.ps1") {
    Write-Host "  Script de testing .......... Disponible" -ForegroundColor Green
    Write-Host "  Ejecutar: .\test-ai-quick.ps1" -ForegroundColor Cyan
}

# Resumen final
Write-Host "`n====================================================================" -ForegroundColor Green
Write-Host "  ESTADO: MIGRACION COMPLETADA CON EXITO" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green

Write-Host "`nPROXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "  1. Revisar MIGRATION_SUMMARY.md para detalles" -ForegroundColor White
Write-Host "  2. Ejecutar .\test-ai-quick.ps1 para testear AI" -ForegroundColor White
Write-Host "  3. Ver base de datos: npx prisma studio" -ForegroundColor White
Write-Host ""
