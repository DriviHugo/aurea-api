/*
  Warnings:

  - You are about to drop the `api_keys` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EstadoExpediente" AS ENUM ('ingesta', 'borrador', 'alternativas', 'validado', 'aprobado', 'revision', 'incidencia', 'en_redaccion', 'con_observaciones', 'listo_validacion', 'en_intervencion', 'cerrado');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('obras', 'servicios', 'suministros', 'concesion_obras', 'concesion_servicios', 'mixto');

-- CreateEnum
CREATE TYPE "TipoProcedimiento" AS ENUM ('abierto', 'abierto_simplificado', 'abierto_supersimplificado', 'restringido', 'negociado_sin_publicidad', 'negociado_con_publicidad', 'dialogo_competitivo', 'asociacion_innovacion', 'menor', 'contrato_basado');

-- CreateEnum
CREATE TYPE "SeveridadRegla" AS ENUM ('bloqueo', 'aviso', 'recomendacion');

-- CreateEnum
CREATE TYPE "EstadoRevision" AS ENUM ('pendiente', 'en_revision', 'aprobado', 'rechazado', 'corregir');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('tramitador', 'juridico', 'interventor', 'supervisor', 'auditor', 'admin', 'auditor_app', 'auditor_ia');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('memoria', 'ppt', 'pcap', 'anexo_tecnico', 'anexo_economico', 'informe_necesidad', 'justificacion_procedimiento');

-- CreateEnum
CREATE TYPE "TipoFuente" AS ENUM ('boe', 'pcsp', 'doctrina', 'alfil', 'plantilla', 'tribunal_cuentas');

-- CreateEnum
CREATE TYPE "DecisionRevision" AS ENUM ('conforme', 'corregir', 'rechazar');

-- CreateEnum
CREATE TYPE "AiProviderType" AS ENUM ('lovable', 'openai', 'custom');

-- CreateEnum
CREATE TYPE "NivelRiesgo" AS ENUM ('verde', 'ambar', 'rojo');

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropTable
DROP TABLE "api_keys";

-- DropTable
DROP TABLE "sessions";

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT,
    "unidad" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "mostrar_ayuda_wizard" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "RolUsuario" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expedientes" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "organo" TEXT NOT NULL,
    "creador_id" UUID NOT NULL,
    "estado" "EstadoExpediente" NOT NULL DEFAULT 'borrador',
    "tipo_contrato" "TipoContrato" NOT NULL,
    "objeto" TEXT NOT NULL,
    "descripcion" TEXT,
    "valor_estimado_contrato" DECIMAL(15,2),
    "presupuesto_base_licitacion" DECIMAL(15,2),
    "iva" DECIMAL(15,2),
    "importe_prorrogas" DECIMAL(15,2),
    "importe_modificados" DECIMAL(15,2),
    "procedimiento_propuesto" "TipoProcedimiento",
    "procedimiento_seleccionado" "TipoProcedimiento",
    "cpv_elegido" TEXT,
    "tiene_lotes" BOOLEAN NOT NULL DEFAULT false,
    "justificacion_lotes" TEXT,
    "num_lotes" INTEGER,
    "es_urgente" BOOLEAN NOT NULL DEFAULT false,
    "es_emergencia" BOOLEAN NOT NULL DEFAULT false,
    "justificacion_urgencia" TEXT,
    "porcentaje_completitud" INTEGER DEFAULT 0,
    "nivel_riesgo" "NivelRiesgo" DEFAULT 'verde',
    "ultima_accion_pendiente" TEXT,
    "fecha_vencimiento" TIMESTAMP(3),
    "metadatos" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expedientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alternativas_procedimiento" (
    "id" UUID NOT NULL,
    "expediente_id" UUID NOT NULL,
    "procedimiento" "TipoProcedimiento" NOT NULL,
    "puntuacion" INTEGER,
    "justificacion" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alternativas_procedimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpv_recomendados" (
    "id" UUID NOT NULL,
    "expediente_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "puntuacion" INTEGER,
    "justificacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cpv_recomendados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpv_codigos" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "descripcion_en" TEXT,
    "nivel" INTEGER NOT NULL,
    "codigo_padre" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cpv_codigos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencias" (
    "id" UUID NOT NULL,
    "tipo_fuente" "TipoFuente" NOT NULL,
    "fuente_id" TEXT NOT NULL,
    "fuente_nombre" TEXT NOT NULL,
    "seccion" TEXT,
    "rango" TEXT,
    "version" TEXT NOT NULL,
    "fecha_vigencia_inicio" DATE NOT NULL,
    "fecha_vigencia_fin" DATE,
    "texto_fragmento" TEXT NOT NULL,
    "metadatos" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglas" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "severidad" "SeveridadRegla" NOT NULL,
    "evidencia_id" UUID,
    "condicion" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "aprobador_id" UUID,
    "aprobador_rol" "RolUsuario",
    "fecha_aprobacion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reglas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" UUID NOT NULL,
    "expediente_id" UUID NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "nombre" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "hash" TEXT,
    "estado" "EstadoRevision" NOT NULL DEFAULT 'pendiente',
    "contenido" JSONB,
    "url_docx" TEXT,
    "url_pdf" TEXT,
    "creador_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_evidencias" (
    "id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "evidencia_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_evidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_secciones" (
    "id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "contenido" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "tokens_usados" INTEGER,
    "tiempo_generacion_ms" INTEGER,
    "articulos_lcsp" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documento_secciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_generaciones" (
    "id" UUID NOT NULL,
    "documento_id" UUID,
    "expediente_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "plan" JSONB NOT NULL DEFAULT '{}',
    "estado" TEXT NOT NULL DEFAULT 'planificando',
    "seccion_actual" INTEGER DEFAULT 0,
    "total_secciones" INTEGER,
    "revision_global" JSONB,
    "errores" JSONB,
    "usuario_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "documento_generaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_versiones" (
    "id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "contenido_snapshot" JSONB NOT NULL,
    "secciones_snapshot" JSONB,
    "descripcion_cambio" TEXT,
    "usuario_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_versiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validaciones" (
    "id" UUID NOT NULL,
    "expediente_id" UUID NOT NULL,
    "documento_id" UUID,
    "regla_id" UUID NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "valor_encontrado" TEXT,
    "explicacion" TEXT NOT NULL,
    "puntuacion_estructura" INTEGER,
    "puntuacion_contenido" INTEGER,
    "usuario_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validaciones_evidencias" (
    "id" UUID NOT NULL,
    "validacion_id" UUID NOT NULL,
    "evidencia_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validaciones_evidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisiones" (
    "id" UUID NOT NULL,
    "expediente_id" UUID NOT NULL,
    "documento_id" UUID,
    "usuario_id" UUID NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "cambio_descripcion" TEXT NOT NULL,
    "decision" "DecisionRevision" NOT NULL,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revisiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios" (
    "id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "texto" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "expediente_id" UUID,
    "usuario_id" UUID,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" UUID,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_providers" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "AiProviderType" NOT NULL DEFAULT 'custom',
    "base_url" TEXT NOT NULL,
    "api_key_secret_name" TEXT,
    "modelos_disponibles" TEXT[],
    "parametros_defecto" JSONB NOT NULL DEFAULT '{"temperature": 0.3}',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_functions" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL,
    "provider_id" UUID,
    "modelo" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "user_prompt_template" TEXT,
    "tool_schema" JSONB,
    "parametros" JSONB NOT NULL DEFAULT '{"temperature": 0.3}',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "version_actual" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_functions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_function_versions" (
    "id" UUID NOT NULL,
    "function_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "user_prompt_template" TEXT,
    "tool_schema" JSONB,
    "parametros" JSONB,
    "modelo" TEXT NOT NULL,
    "provider_id" UUID,
    "motivo_cambio" TEXT,
    "creado_por" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_function_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_function_logs" (
    "id" UUID NOT NULL,
    "function_code" TEXT NOT NULL,
    "function_name" TEXT,
    "provider_name" TEXT,
    "modelo" TEXT NOT NULL,
    "input_variables" JSONB NOT NULL DEFAULT '{}',
    "system_prompt" TEXT,
    "user_prompt" TEXT,
    "response" JSONB,
    "tokens_input" INTEGER,
    "tokens_output" INTEGER,
    "duration_ms" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error_message" TEXT,
    "usuario_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_function_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidencias" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "ubicacion" TEXT NOT NULL,
    "funcionalidad" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "comportamiento_esperado" TEXT NOT NULL,
    "screenshot_url" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "expedientes_codigo_key" ON "expedientes"("codigo");

-- CreateIndex
CREATE INDEX "idx_expedientes_estado" ON "expedientes"("estado");

-- CreateIndex
CREATE INDEX "idx_expedientes_creador" ON "expedientes"("creador_id");

-- CreateIndex
CREATE INDEX "idx_expedientes_unidad" ON "expedientes"("unidad");

-- CreateIndex
CREATE UNIQUE INDEX "cpv_codigos_codigo_key" ON "cpv_codigos"("codigo");

-- CreateIndex
CREATE INDEX "idx_cpv_codigo" ON "cpv_codigos"("codigo");

-- CreateIndex
CREATE INDEX "idx_cpv_codigo_prefix" ON "cpv_codigos"("codigo");

-- CreateIndex
CREATE INDEX "idx_cpv_nivel" ON "cpv_codigos"("nivel");

-- CreateIndex
CREATE INDEX "idx_cpv_activo" ON "cpv_codigos"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "reglas_codigo_key" ON "reglas"("codigo");

-- CreateIndex
CREATE INDEX "idx_documentos_expediente" ON "documentos"("expediente_id");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_evidencias_documento_id_evidencia_id_key" ON "documentos_evidencias"("documento_id", "evidencia_id");

-- CreateIndex
CREATE INDEX "idx_documento_secciones_documento" ON "documento_secciones"("documento_id");

-- CreateIndex
CREATE INDEX "idx_documento_secciones_estado" ON "documento_secciones"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "documento_secciones_documento_id_orden_key" ON "documento_secciones"("documento_id", "orden");

-- CreateIndex
CREATE INDEX "idx_documento_generaciones_documento" ON "documento_generaciones"("documento_id");

-- CreateIndex
CREATE INDEX "idx_documento_generaciones_estado" ON "documento_generaciones"("estado");

-- CreateIndex
CREATE INDEX "idx_documento_versiones_documento" ON "documento_versiones"("documento_id");

-- CreateIndex
CREATE UNIQUE INDEX "documento_versiones_documento_id_version_key" ON "documento_versiones"("documento_id", "version");

-- CreateIndex
CREATE INDEX "idx_validaciones_expediente" ON "validaciones"("expediente_id");

-- CreateIndex
CREATE UNIQUE INDEX "validaciones_evidencias_validacion_id_evidencia_id_key" ON "validaciones_evidencias"("validacion_id", "evidencia_id");

-- CreateIndex
CREATE INDEX "idx_revisiones_expediente" ON "revisiones"("expediente_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_expediente" ON "audit_log"("expediente_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_created" ON "audit_log"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ai_providers_nombre_key" ON "ai_providers"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ai_functions_codigo_key" ON "ai_functions"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ai_function_versions_function_id_version_key" ON "ai_function_versions"("function_id", "version");

-- CreateIndex
CREATE INDEX "idx_ai_function_logs_created_at" ON "ai_function_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_ai_function_logs_function_code" ON "ai_function_logs"("function_code");

-- AddForeignKey
ALTER TABLE "alternativas_procedimiento" ADD CONSTRAINT "alternativas_procedimiento_expediente_id_fkey" FOREIGN KEY ("expediente_id") REFERENCES "expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cpv_recomendados" ADD CONSTRAINT "cpv_recomendados_expediente_id_fkey" FOREIGN KEY ("expediente_id") REFERENCES "expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas" ADD CONSTRAINT "reglas_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_expediente_id_fkey" FOREIGN KEY ("expediente_id") REFERENCES "expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_evidencias" ADD CONSTRAINT "documentos_evidencias_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_evidencias" ADD CONSTRAINT "documentos_evidencias_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_secciones" ADD CONSTRAINT "documento_secciones_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_generaciones" ADD CONSTRAINT "documento_generaciones_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_generaciones" ADD CONSTRAINT "documento_generaciones_expediente_id_fkey" FOREIGN KEY ("expediente_id") REFERENCES "expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_versiones" ADD CONSTRAINT "documento_versiones_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validaciones" ADD CONSTRAINT "validaciones_expediente_id_fkey" FOREIGN KEY ("expediente_id") REFERENCES "expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validaciones" ADD CONSTRAINT "validaciones_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validaciones" ADD CONSTRAINT "validaciones_regla_id_fkey" FOREIGN KEY ("regla_id") REFERENCES "reglas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validaciones_evidencias" ADD CONSTRAINT "validaciones_evidencias_validacion_id_fkey" FOREIGN KEY ("validacion_id") REFERENCES "validaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validaciones_evidencias" ADD CONSTRAINT "validaciones_evidencias_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisiones" ADD CONSTRAINT "revisiones_expediente_id_fkey" FOREIGN KEY ("expediente_id") REFERENCES "expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisiones" ADD CONSTRAINT "revisiones_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "revisiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_expediente_id_fkey" FOREIGN KEY ("expediente_id") REFERENCES "expedientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_functions" ADD CONSTRAINT "ai_functions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ai_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_function_versions" ADD CONSTRAINT "ai_function_versions_function_id_fkey" FOREIGN KEY ("function_id") REFERENCES "ai_functions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_function_versions" ADD CONSTRAINT "ai_function_versions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ai_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
