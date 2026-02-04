import { type FastifyInstance } from "fastify";
import { userResponseSchema } from "./user.js";
import { basicResponseSchema } from "./common.js";

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.addSchema({
    $id: "User",
    ...userResponseSchema,
  });

  fastify.addSchema({
    $id: "BasicResponse",
    ...basicResponseSchema,
  });
}
