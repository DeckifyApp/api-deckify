FROM node:22-alpine AS base

RUN apk add --no-cache openssl && npm install --global npm@12.0.2

FROM base AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

FROM base

WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate
COPY --from=build /app/dist ./dist

EXPOSE 3333
USER node

CMD ["npm", "start"]
