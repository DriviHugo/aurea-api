#!/usr/bin/env pwsh
# Script para ejecutar migraciones en el directorio correcto

Set-Location $PSScriptRoot
Write-Host "📂 Directorio actual: $PWD"

# Cargar variables de entorno desde .env
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#=]+)=(.+)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
            Write-Host "✅ Cargada variable: $name"
        }
    }
}

Write-Host "`n🚀 Ejecutando generador de rutas..."
npx tsx migration/ai-migrators/route-generator.ts
