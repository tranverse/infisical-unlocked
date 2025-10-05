import { z } from "zod";
import { verifyAuth } from "@app/server/plugins/auth/verify-auth";
import { SecretMappingsSchema } from "@app/db/schemas";
import { readLimit, secretsLimit } from "@app/server/config/rateLimiter";
import { BaseSecretNameSchema, SecretNameSchema } from "@app/server/lib/schemas";
import { MAPPING_SECRETS } from "@app/lib/api-docs";
import { ApiDocsTags, RAW_SECRETS } from "@app/lib/api-docs";
import { SanitizedTagSchema, mappingSecretSchema, secretRawSchema } from "../sanitizedSchemas";
import { ActorType, AuthMode } from "@app/services/auth/auth-type";
import { removeTrailingSlash } from "@app/lib/fn";

export const registerSecretMappingRouter = async (server: FastifyZodProvider) => {
  // secret mapping
  server.route({
    method: "PATCH",
    url: "/:secretKey",
    config: {
      rateLimit: secretsLimit
    },
    schema: {
      hide: false,
      description: "Update mapping secret",
      security: [{ bearerAuth: [] }],
      params: z.object({
        secretKey: BaseSecretNameSchema.describe(MAPPING_SECRETS.UPDATE.secretName)
      }),
      body: z.object({
        value: z.string(),
        newValue: z.string(),
        projectId: z.string().trim(),
        environment: z.string().trim(),
        secretPath: z.string().trim().default("/").transform(removeTrailingSlash)
      }),
      response: {
        200: z.object({
          updateMappingSecret: mappingSecretSchema,
          secrets: z.array(
            secretRawSchema.extend({
              folderName: z.string().trim()
            })
          )
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.SERVICE_TOKEN, AuthMode.IDENTITY_ACCESS_TOKEN]),
    handler: async (req) => {
      const secretOperation = await server.services.secretMapping.updateValueMappingSecret({
        secretKey: req.params.secretKey,
        projectId: req.body.projectId,
        value: req.body.value,
        newValue: req.body.newValue,
        environment: req.body.environment,
        secretPath: req.body.secretPath,
        actorId: req.permission.id,
        actor: req.permission.type,
        actorOrgId: req.permission.orgId,
        actorAuthMethod: req.permission.authMethod
      });

      return {
        updateMappingSecret: secretOperation.updateMappingSecret,
        secrets: secretOperation.secrets
      };
    }
  });

  server.route({
    method: "GET",
    url: "/:projectId",
    config: {
      rateLimit: secretsLimit
    },
    schema: {
      hide: false,
      description: "Get mapping secrets",
      security: [{ bearerAuth: [] }],
      params: z.object({
        projectId: z.string().trim()
      }),
      response: {
        200: z.object({
          mappingSecrets: z.array(mappingSecretSchema)
        })
      }
    },
    handler: async (req) => {
      const secrets = await server.services.secretMapping.getMappingSecretsInProject({
        projectId: req.params.projectId,
        actorId: req.permission.id,
        actor: req.permission.type,
        actorOrgId: req.permission.orgId,
        actorAuthMethod: req.permission.authMethod
      });

      return {
        mappingSecrets: secrets
      };
    }
  });

  server.route({
    method: "DELETE",
    url: "/:mappingId",
    config: {
      rateLimit: secretsLimit
    },
    schema: {
      hide: false,
      description: "Delete mapping secret",
      security: [{ bearerAuth: [] }],
      params: z.object({
        mappingId: z.string().trim()
      }),
      body: z.object({
        projectId: z.string()
      }),
      response: {
        200: z.object({
          mappingSecrets: z.string()
        })
      }
    },
    handler: async (req) => {
      const secret = await server.services.secretMapping.deleteMappingSecretsInProject({
        mappingId: req.params.mappingId,
        actorId: req.permission.id,
        actor: req.permission.type,
        projectId: req.body.projectId,
        actorOrgId: req.permission.orgId,
        actorAuthMethod: req.permission.authMethod
      });

      return {
        mappingSecrets: secret
      };
    }
  });

  server.route({
    method: "GET",
    url: "/all-secrets/:mappingId",
    config: {
      rateLimit: secretsLimit
    },
    schema: {
      hide: false,
      description: "Get secrets and mapping secret",
      security: [{ bearerAuth: [] }],
      params: z.object({
        mappingId: z.string().trim()
      }),
      querystring: z.object({
        projectId: z.string().trim()
        // environment: z.string().trim() // thêm environment
      }),
      response: {
        200: z.object({
          mappingSecrets: mappingSecretSchema,
          secrets: z.array(
            secretRawSchema.extend({
              folderName: z.string().trim(),
              env: z.string().trim(),
              key: z.string().trim()
            })
          )
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.SERVICE_TOKEN, AuthMode.IDENTITY_ACCESS_TOKEN]),
    handler: async (req) => {
      const secrets = await server.services.secretMapping.getSecretsAndMappingSecretInProject({
        projectId: req.query.projectId,
        actorId: req.permission.id,
        actor: req.permission.type,
        actorOrgId: req.permission.orgId,
        actorAuthMethod: req.permission.authMethod,
        mappingId: req.params.mappingId
        // environment: req.params.environment
      });

      return {
        mappingSecrets: secrets.returnMappingSecret,
        secrets: secrets.returnSecrets
      };
    }
  });
};
