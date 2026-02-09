#!/usr/bin/env node
/**
 * Quick test - assumes server is already running
 */

const models = [
  "aifunction", "aifunctionlog", "aifunctionversion", "aiprovider",
  "alternativaprocedimiento", "auditlog", "comentario", "cpvcodigo",
  "cpvrecomendado", "documento", "documentoevidencia", "documentogeneracion",
  "documentoseccion", "documentoversion", "evidencia", "expediente",
  "incidencia", "profile", "regla", "revision", "userrole",
  "validacion", "validacionevidencia"
];

const API_BASE_URL = "http://localhost:4789";

async function quickTest() {
  console.log("🧪 Quick Endpoint Test (server must be running)\n");
  
  let success = 0;
  let protectedCount = 0;
  let failed = 0;
  
  for (const model of models) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/private/${model}`);
      if (response.status === 401) {
        console.log(`🔒 ${model}: 401 (Protected)`);
        success++;
        protectedCount++;
      } else if (response.ok) {
        console.log(`✅ ${model}: ${response.status}`);
        success++;
      } else {
        console.log(`❌ ${model}: ${response.status}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${model}: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${success}/23 success (${protectedCount} protected), ${failed} failed`);
}

quickTest();
