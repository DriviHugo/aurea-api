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
  key: string;
}

export default async function storageRoutes(fastify: FastifyInstance) {
  const storage = getStorageService();

  // Upload file
  fastify.post<{ Params: UploadParams }>(
    "/storage/:bucket/upload",
    async (request: FastifyRequest<{ Params: UploadParams }>, reply: FastifyReply) => {
      const { bucket } = request.params;
      const buckets = storage.getBuckets();

      // Validate bucket
      if (!Object.values(buckets).includes(bucket)) {
        return reply.status(400).send({
          error: "Invalid bucket",
          message: `Bucket must be one of: ${Object.values(buckets).join(", ")}`,
        });
      }

      // Get file from multipart
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          error: "No file provided",
          message: "Request must include a file",
        });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const result = await storage.uploadBuffer(
        bucket,
        data.filename,
        buffer,
        data.mimetype,
      );

      return reply.status(201).send(result);
    },
  );

  // Download file
  fastify.get<{ Params: FileParams }>(
    "/storage/:bucket/:key",
    async (request: FastifyRequest<{ Params: FileParams }>, reply: FastifyReply) => {
      const { bucket, key } = request.params;

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
    "/storage/:bucket/:key/info",
    async (request: FastifyRequest<{ Params: FileParams }>, reply: FastifyReply) => {
      const { bucket, key } = request.params;

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
    "/storage/:bucket/:key/presigned",
    async (
      request: FastifyRequest<{ Params: FileParams; Querystring: { expires?: string } }>,
      reply: FastifyReply,
    ) => {
      const { bucket, key } = request.params;
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
    "/storage/:bucket/:key",
    async (request: FastifyRequest<{ Params: FileParams }>, reply: FastifyReply) => {
      const { bucket, key } = request.params;

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
      request: FastifyRequest<{ Params: UploadParams; Querystring: { prefix?: string } }>,
      reply: FastifyReply,
    ) => {
      const { bucket } = request.params;
      const { prefix } = request.query;

      const files = await storage.listFiles(bucket, prefix);
      return reply.send({ files, count: files.length });
    },
  );
}
