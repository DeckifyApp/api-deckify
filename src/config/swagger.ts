import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Deckify Backend API',
    version: '1.0.0',
    description: 'Deckify mobile-first flashcard backend MVP',
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'DECK_NOT_FOUND' },
              message: { type: 'string', example: 'Deck not found' },
            },
          },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  avatarUrl: { type: 'string', nullable: true },
                },
              },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
      DeckInput: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          visibility: { type: 'string', enum: ['PRIVATE', 'PUBLIC', 'UNLISTED'] },
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['title', 'visibility'],
      },
      CardInput: {
        type: 'object',
        properties: {
          front: { type: 'string' },
          back: { type: 'string' },
          explanation: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          imageAlt: { type: 'string', nullable: true },
          difficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
          position: { type: 'integer' },
        },
        required: ['front', 'back'],
      },
      ReviewInput: {
        type: 'object',
        properties: {
          result: {
            type: 'string',
            enum: ['AGAIN', 'GOOD'],
          },
        },
        required: ['result'],
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'API health check',
        responses: {
          200: {
            description: 'OK',
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
                required: ['name', 'email', 'password'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          409: {
            description: 'Email conflict',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token (rotation)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
                required: ['refreshToken'],
              },
            },
          },
        },
        responses: {
          200: { description: 'OK' },
          401: { description: 'Invalid refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout/revoke refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
                required: ['refreshToken'],
              },
            },
          },
        },
        responses: {
          200: { description: 'OK' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current auth user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'OK' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get profile',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' } },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  avatarUrl: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'OK' } },
      },
    },
    '/decks': {
      get: {
        tags: ['Decks'],
        summary: 'List user library decks (owned + saved)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' } },
      },
      post: {
        tags: ['Decks'],
        summary: 'Create deck',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DeckInput' },
            },
          },
        },
        responses: {
          201: { description: 'Created' },
        },
      },
    },
    '/decks/{deckId}': {
      get: {
        tags: ['Decks'],
        summary: 'Get deck by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'deckId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'OK' } },
      },
      patch: {
        tags: ['Decks'],
        summary: 'Update own deck',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'deckId', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DeckInput' },
            },
          },
        },
        responses: { 200: { description: 'OK' } },
      },
      delete: {
        tags: ['Decks'],
        summary: 'Archive own deck',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'deckId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/decks/{deckId}/cards': {
      get: {
        tags: ['Cards'],
        summary: 'List cards from accessible deck',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'deckId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'OK' } },
      },
      post: {
        tags: ['Cards'],
        summary: 'Create card in own deck',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'deckId', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CardInput' },
            },
          },
        },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/cards/{cardId}': {
      get: {
        tags: ['Cards'],
        summary: 'Get accessible card by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'cardId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'OK' } },
      },
      patch: {
        tags: ['Cards'],
        summary: 'Update own card',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'cardId', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CardInput' },
            },
          },
        },
        responses: { 200: { description: 'OK' } },
      },
      delete: {
        tags: ['Cards'],
        summary: 'Archive own card',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'cardId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/community/decks': {
      get: {
        tags: ['Community'],
        summary: 'Discover public community decks',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'tag', schema: { type: 'string' } },
          { in: 'query', name: 'sort', schema: { type: 'string', enum: ['recent', 'popular'] } },
        ],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/community/decks/{deckId}': {
      get: {
        tags: ['Community'],
        summary: 'Get community deck by id (public/unlisted)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'deckId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/community/decks/{deckId}/save': {
      post: {
        tags: ['Community'],
        summary: 'Save community deck',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'deckId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 201: { description: 'Saved' } },
      },
      delete: {
        tags: ['Community'],
        summary: 'Unsave community deck',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'deckId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Unsaved' } },
      },
    },
    '/community/decks/{deckId}/fork': {
      post: {
        tags: ['Community'],
        summary: 'Fork community deck',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'deckId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 201: { description: 'Fork created' } },
      },
    },
    '/study/decks/{deckId}/start': {
      post: {
        tags: ['Study'],
        summary: 'Initialize study progress for deck cards',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'deckId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/study/decks/{deckId}/due': {
      get: {
        tags: ['Study'],
        summary: 'Get due cards for deck',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'deckId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/study/cards/{cardId}/review': {
      post: {
        tags: ['Study'],
        summary: 'Submit card review result',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'cardId', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReviewInput' },
            },
          },
        },
        responses: { 200: { description: 'OK' } },
      },
    },
    '/study/decks/{deckId}/stats': {
      get: {
        tags: ['Study'],
        summary: 'Get study stats for deck',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'deckId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
  },
} as const;

export function setupSwagger(app: Express): void {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
