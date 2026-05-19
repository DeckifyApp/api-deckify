# Deckify Backend MVP

Backend API for Deckify, a mobile-first flashcard study app using a Leitner-based review system.

This project implements:
- JWT auth with refresh-token rotation
- Deck/card CRUD with ownership and visibility rules
- Community discovery, save, and fork workflows
- Per-user study progress and review history
- Swagger docs for manual API testing
- Dockerized local development with PostgreSQL

## Tech Stack

- Node.js
- Express.js + TypeScript (strict)
- PostgreSQL
- Prisma ORM
- Zod validation
- JWT access tokens + hashed refresh tokens in DB
- Helmet, CORS, auth rate limiting
- Vitest + Supertest integration tests
- ESLint + Prettier
- Docker + Docker Compose

## Project Structure

src/
- app.ts
- server.ts
- config/
  - env.ts
  - prisma.ts
  - swagger.ts
- shared/
  - errors/
  - middleware/
  - utils/
  - types/
- modules/
  - auth/
  - users/
  - decks/
  - cards/
  - community/
  - study/
  - tags/

prisma/
- schema.prisma
- migrations/
- seed.ts

tests/
- integration/
- helpers/

## Environment Variables

Copy `.env.example` to `.env`.

Required values:

- NODE_ENV=development
- PORT=3333
- DATABASE_URL=postgresql://deckify:deckify@localhost:5432/deckify
- JWT_ACCESS_SECRET=replace_me
- JWT_REFRESH_SECRET=replace_me
- ACCESS_TOKEN_EXPIRES_IN=15m
- REFRESH_TOKEN_EXPIRES_IN=30d
- CORS_ORIGIN=*

The app validates env vars at startup and fails fast on invalid/missing values.

## Local Setup (without Docker)

1) Install dependencies

npm install

2) Start PostgreSQL (locally)

3) Generate Prisma client

npm run prisma:generate

4) Start API

npm run dev

On startup, the API will:
- wait for PostgreSQL readiness (with retries)
- create the target database if it does not exist
- run `prisma migrate deploy` to create/update tables

5) Seed data (optional)

npm run prisma:seed

API runs at: http://localhost:3333

## Docker Setup

1) Build and run API + PostgreSQL

docker compose up --build

2) Open Swagger docs

http://localhost:3333/docs

Notes:
- Compose overrides `DATABASE_URL` inside the API container to use the `postgres` service host.
- On API startup, bootstrap will wait for DB readiness, ensure the database exists, and run migrations (`prisma migrate deploy`).

## Prisma & Migrations

- Create migration (development):
  npm run prisma:migrate

- Deploy migrations:
  npm run prisma:deploy

- Generate client:
  npm run prisma:generate

## Seed Data

Run:

npm run prisma:seed

Seed includes:
- 3 users
- 5 decks with PRIVATE/PUBLIC/UNLISTED visibility
- public decks with >=10 cards
- mixed difficulty levels
- imageUrl/imageAlt on some cards
- multiple tags (programming, biology, history, math, english, science)
- saved deck relationships

## Tests

Run full integration tests:

npm test

Run watch mode:

npm run test:watch

Coverage focus includes:
- Auth: register/login/refresh/logout
- Deck authz and archive flows
- Card authz and archive flows
- Community discover/save/unsave/fork
- Study start/due/review/stats and user-isolated progress

## Lint & Build

- Lint:
  npm run lint

- Format:
  npm run format

- Build:
  npm run build

## Swagger/OpenAPI

Docs URL:

http://localhost:3333/docs

Includes:
- auth, users, decks, cards, community, study endpoints
- request/response payloads
- bearer auth scheme for protected endpoints

## API Overview

Health
- GET /health

Auth
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- GET /auth/me

Users
- GET /users/me
- PATCH /users/me

Decks
- POST /decks
- GET /decks
- GET /decks/:deckId
- PATCH /decks/:deckId
- DELETE /decks/:deckId (archives)

Cards
- POST /decks/:deckId/cards
- GET /decks/:deckId/cards
- GET /cards/:cardId
- PATCH /cards/:cardId
- DELETE /cards/:cardId (archives)

Community
- GET /community/decks
- GET /community/decks/:deckId
- POST /community/decks/:deckId/save
- DELETE /community/decks/:deckId/save
- POST /community/decks/:deckId/fork

Study
- POST /study/decks/:deckId/start
- GET /study/decks/:deckId/due
- POST /study/cards/:cardId/review
- GET /study/decks/:deckId/stats

## Architecture Notes

Modular monolith with flow:

Route -> Controller -> Service -> Prisma

- Routes: endpoint wiring and middleware
- Controllers: request/response handling only
- Services: business logic, authorization, transactions
- Prisma: persistence and relational querying

Key domain rules implemented:
- Deck visibility: PRIVATE / PUBLIC / UNLISTED
- Save vs Fork semantics
- Object-level authorization checks
- Per-user CardProgress and ReviewLog for Leitner reviews

## Security Notes

Implemented:
- Password hashing (bcrypt)
- JWT access tokens
- Hashed refresh tokens in DB
- Refresh token rotation
- Token revocation on logout
- Helmet
- CORS
- Request size limits
- Auth route rate limiting
- Centralized safe error responses

## MVP Limitations

Not included in this MVP:
- comments/ratings/following
- notifications
- AI generation
- admin moderation
- payments/gamification
- binary image upload/storage pipeline (only imageUrl/imageAlt)

## Response Format

Success:

{
  "success": true,
  "data": {}
}

List:

{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

Error:

{
  "success": false,
  "error": {
    "code": "DECK_NOT_FOUND",
    "message": "Deck not found"
  }
}
