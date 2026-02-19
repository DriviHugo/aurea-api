/**
 * Storage Routes - File upload/download endpoints
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getStorageService } from "../../services/storage.service.js";

interface UploadParams {
  bucket: string;
}

interface FileParams {
  bucket: string;
  "*": string; // Wildcard for key with slashes
}

// Type for multipart file when attachFieldsToBody is true
interface MultipartFile {
  type: "file";
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  toBuffer: () => Promise<Buffer>;
}

interface UploadBody {
  file?: MultipartFile;
  path?: { value: string };
}

export default async function storageRoutes(fastify: FastifyInstance) {
  const storage = getStorageService();

  // Upload file
  fastify.post<{ Params: UploadParams; Body: UploadBody }>(
    "/storage/:bucket/upload",
    async (
      request: FastifyRequest<{ Params: UploadParams; Body: UploadBody }>,
      reply: FastifyReply,
    ) => {
      const { bucket } = request.params;

      // Get file from body (attachFieldsToBody mode)
      const fileField = request.body?.file;
      if (fileField?.type !== "file") {
        return reply.status(400).send({
          error: "No file provided",
          message: "Request must include a file field",
        });
      }

      const buffer = await fileField.toBuffer();

      // Use path from body if provided, otherwise use original filename with unique prefix
      const key = request.body?.path?.value || fileField.filename;
      const preserveKey = !!request.body?.path?.value;

      try {
        const result = await storage.uploadBuffer(
          bucket,
          key,
          buffer,
          fileField.mimetype,
          { preserveKey },
        );

        return reply.status(201).send(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        return reply.status(500).send({
          error: "Upload failed",
          message,
        });
      }
    },
  );

  // Download file (supports keys with slashes using wildcard)
  fastify.get<{ Params: FileParams }>(
    "/storage/:bucket/file/*",
    async (
      request: FastifyRequest<{ Params: FileParams }>,
      reply: FastifyReply,
    ) => {
      const { bucket } = request.params;
      const key = request.params["*"];

      const exists = await storage.fileExists(bucket, key);
      if (!exists) {
        return reply.status(404).send({
          error: "File not found",
          message: `File ${key} not found in bucket ${bucket}`,
        });
      }

      const info = await storage.getFileInfo(bucket, key);
      const stream = await storage.downloadStream(bucket, key);

      return reply
        .header("Content-Type", info.contentType ?? "application/octet-stream")
        .header("Content-Length", info.size)
        .header("Content-Disposition", `attachment; filename="${key}"`)
        .send(stream);
    },
  );

  // Get file info
  fastify.get<{ Params: FileParams }>(
    "/storage/:bucket/info/*",
    async (
      request: FastifyRequest<{ Params: FileParams }>,
      reply: FastifyReply,
    ) => {
      const { bucket } = request.params;
      const key = request.params["*"];

      const exists = await storage.fileExists(bucket, key);
      if (!exists) {
        return reply.status(404).send({
          error: "File not found",
          message: `File ${key} not found in bucket ${bucket}`,
        });
      }

      const info = await storage.getFileInfo(bucket, key);
      return reply.send(info);
    },
  );

  // Get presigned download URL
  fastify.get<{ Params: FileParams; Querystring: { expires?: string } }>(
    "/storage/:bucket/presigned/*",
    async (
      request: FastifyRequest<{
        Params: FileParams;
        Querystring: { expires?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { bucket } = request.params;
      const key = request.params["*"];
      const expires = parseInt(request.query.expires ?? "3600", 10);

      const exists = await storage.fileExists(bucket, key);
      if (!exists) {
        return reply.status(404).send({
          error: "File not found",
          message: `File ${key} not found in bucket ${bucket}`,
        });
      }

      const url = await storage.getPresignedUrl(bucket, key, expires);
      return reply.send({ url, expiresIn: expires });
    },
  );

  // Delete file
  fastify.delete<{ Params: FileParams }>(
    "/storage/:bucket/file/*",
    async (
      request: FastifyRequest<{ Params: FileParams }>,
      reply: FastifyReply,
    ) => {
      const { bucket } = request.params;
      const key = request.params["*"];

      const exists = await storage.fileExists(bucket, key);
      if (!exists) {
        return reply.status(404).send({
          error: "File not found",
          message: `File ${key} not found in bucket ${bucket}`,
        });
      }

      await storage.deleteFile(bucket, key);
      return reply.status(204).send();
    },
  );

  // List files in bucket
  fastify.get<{ Params: UploadParams; Querystring: { prefix?: string } }>(
    "/storage/:bucket",
    async (
      request: FastifyRequest<{
        Params: UploadParams;
        Querystring: { prefix?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { bucket } = request.params;
      const { prefix } = request.query;

      const files = await storage.listFiles(bucket, prefix);
      return reply.send({ files, count: files.length });
    },
  );
}
